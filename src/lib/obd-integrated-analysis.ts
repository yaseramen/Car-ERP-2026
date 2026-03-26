import type { ObdResult } from "@/lib/obd";

export type IntegratedStep = {
  priority: number;
  title: string;
  detail: string;
  related_codes?: string[];
};

export type CodeRelation = {
  from: string;
  to: string;
  relation_ar: string;
};

export type IntegratedAnalysis = {
  /** ملخص 2–4 جمل يربط الأكواد ببعض */
  summary_ar: string;
  /** كيف قد يتسلسل العطل (سبب جذري → أعراض ثانوية) */
  cascade_ar: string;
  /** خطوات عملية مرتبة بالأولوية */
  prioritized_steps: IntegratedStep[];
  /** روابط بين الأكواد في نفس التقرير */
  code_relations: CodeRelation[];
  /** تحذير: الاستنتاجات استرشادية */
  disclaimer_ar: string;
};

const INTEGRATED_PROMPT = `أنت خبير تشخيص أعطال السيارات (OBD/DTC). لديك تقرير واحد يحتوي على عدة أكواد أعطال لنفس المركبة.

الأكواد والبيانات المستخرجة لكل كود (JSON):
{payload}

المطلوب بالعربية فقط، بصيغة JSON صالحة فقط بدون markdown:
{
  "summary_ar": "فقرة قصيرة 2-4 جمل تربط الأكواد ببعض وتشرح الصورة العامة",
  "cascade_ar": "شرح كيف قد يتسلسل العطل (مثلاً عطل حساس يسبب ضعف خليط فيظهر كود آخر) — نص متصل",
  "prioritized_steps": [
    { "priority": 1, "title": "عنوان قصير", "detail": "ماذا تفحص أو تصلح أولاً ولماذا", "related_codes": ["P0xxx"] },
    { "priority": 2, "title": "...", "detail": "...", "related_codes": [] }
  ],
  "code_relations": [
    { "from": "P0xxx", "to": "P0yyy", "relation_ar": "قد يظهر الثاني نتيجة للأول أو مرتبط به لأن..." }
  ],
  "disclaimer_ar": "جملة واحدة: التحليل استرشادي ولا يغني عن الفحص اليدوي والمعدات الاحترافية."
}

قواعد:
- رتّب prioritized_steps من الأهم للأقل (1 = ابدأ هنا).
- إذا كان كود واحد فقط، اشرحه وضع خطوة أو خطوتين عمليتين.
- related_codes: أكواد من القائمة أعلاه ترتبط بهذه الخطوة.
- لا تخترع أكواد غير موجودة في القائمة.`;

function safeJsonParse<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

function normalizeIntegrated(raw: unknown): IntegratedAnalysis | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const summary_ar = typeof o.summary_ar === "string" ? o.summary_ar.trim() : "";
  const cascade_ar = typeof o.cascade_ar === "string" ? o.cascade_ar.trim() : "";
  const disclaimer_ar =
    typeof o.disclaimer_ar === "string"
      ? o.disclaimer_ar.trim()
      : "هذا التحليل استرشادي ولا يغني عن الفحص اليدوي والمعدات الاحترافية.";

  const stepsRaw = Array.isArray(o.prioritized_steps) ? o.prioritized_steps : [];
  const prioritized_steps: IntegratedStep[] = [];
  stepsRaw.forEach((s, idx) => {
    if (!s || typeof s !== "object") return;
    const st = s as Record<string, unknown>;
    const title = typeof st.title === "string" ? st.title.trim() : "";
    const detail = typeof st.detail === "string" ? st.detail.trim() : "";
    if (!title && !detail) return;
    const priority = typeof st.priority === "number" && Number.isFinite(st.priority) ? st.priority : idx + 1;
    const related_codes = Array.isArray(st.related_codes)
      ? st.related_codes.filter((c): c is string => typeof c === "string").map((c) => c.trim().toUpperCase())
      : undefined;
    const step: IntegratedStep = { priority, title: title || `خطوة ${idx + 1}`, detail };
    if (related_codes && related_codes.length > 0) step.related_codes = related_codes;
    prioritized_steps.push(step);
  });

  const relRaw = Array.isArray(o.code_relations) ? o.code_relations : [];
  const code_relations: CodeRelation[] = relRaw
    .map((r) => {
      if (!r || typeof r !== "object") return null;
      const x = r as Record<string, unknown>;
      const from = typeof x.from === "string" ? x.from.trim().toUpperCase() : "";
      const to = typeof x.to === "string" ? x.to.trim().toUpperCase() : "";
      const relation_ar = typeof x.relation_ar === "string" ? x.relation_ar.trim() : "";
      if (!from || !to) return null;
      return { from, to, relation_ar };
    })
    .filter((x): x is CodeRelation => x !== null);

  if (!summary_ar && prioritized_steps.length === 0 && code_relations.length === 0) return null;

  return {
    summary_ar: summary_ar || "—",
    cascade_ar: cascade_ar || "",
    prioritized_steps,
    code_relations,
    disclaimer_ar,
  };
}

export async function analyzeIntegratedObdReport(results: ObdResult[]): Promise<IntegratedAnalysis | null> {
  if (results.length === 0) return null;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const payload = JSON.stringify(
    results.map((r) => ({
      code: r.code,
      description_ar: r.description_ar,
      causes: r.causes,
      solutions: r.solutions,
      symptoms: r.symptoms,
    })),
    null,
    0
  );

  const prompt = INTEGRATED_PROMPT.replace("{payload}", payload);
  const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash"];

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: "أجب بالعربية فقط. JSON صالح فقط بدون تعليقات أو markdown.",
                },
              ],
            },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.25 },
          }),
        }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const parsed = safeJsonParse<unknown>(text);
      const normalized = normalizeIntegrated(parsed);
      if (normalized) return normalized;
    } catch {
      // try next model
    }
  }
  return null;
}

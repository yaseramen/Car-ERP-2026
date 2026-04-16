/**
 * جلب مواصفات التكييف عبر نفس مزودي الذكاء الاصطناعي المستخدمين في OBD.
 */

const AC_SYSTEM = `أنت مساعد فني لورش سيارات. أجب بصيغة JSON صالحة فقط (بدون markdown).
الحقول المطلوبة بالضبط:
- make: اسم الماركة بالإنجليزية أو العربية كما تعرفها للسيارة
- model: اسم الموديل/الفئة
- year_from: سنة بداية التطبيق (رقم صحيح)
- year_to: سنة نهاية التطبيق أو null إذا غير معروفة أو ما زالت مستمرة
- refrigerant_type: واحدة فقط من: R134a | R1234yf | R12 | unknown
- refrigerant_weight: كمية الفريون بالجرام (رقم) أو null إذا غير متأكد
- oil_type: نوع زيت التكييف (مثل PAG 46، PAG 100، POE) أو null
- oil_amount: كمية الزيت بالمليلتر ml (رقم) أو null إذا غير متأكد

إذا لم تستطع التأكد من قيمة، استخدم null أو unknown حسب الحقل. لا تخترع أرقاماً دقيقة إن لم تكن لديك معرفة معقولة بالطراز.`;

function acUserPrompt(make: string, model: string, year: number | null): string {
  const y = year != null && Number.isFinite(year) ? String(Math.trunc(year)) : "غير محدد";
  return `مواصفات تكييف الهواء (A/C) للسيارة:
الماركة: ${make}
الموديل: ${model}
سنة الصنع المرجعية للعميل: ${y}

أعد JSON فقط بهذا الشكل:
{"make":"...","model":"...","year_from":2010,"year_to":null,"refrigerant_type":"R134a","refrigerant_weight":450,"oil_type":"PAG 46","oil_amount":120}`;
}

export type AcSpecsAiPayload = {
  make: string;
  model: string;
  year_from: number;
  year_to: number | null;
  refrigerant_type: string;
  refrigerant_weight: number | null;
  oil_type: string | null;
  oil_amount: number | null;
};

function stripJsonFence(text: string): string {
  const t = text.trim();
  if (t.startsWith("```")) {
    return t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  return t;
}

export function parseAcSpecsJson(text: string): AcSpecsAiPayload | null {
  const cleaned = stripJsonFence(text);
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const p = JSON.parse(match[0]) as Record<string, unknown>;
    const make = typeof p.make === "string" ? p.make.trim() : "";
    const model = typeof p.model === "string" ? p.model.trim() : "";
    const yearFrom = typeof p.year_from === "number" ? p.year_from : Number(p.year_from);
    if (!make || !model || !Number.isFinite(yearFrom)) return null;

    let yearTo: number | null = null;
    if (p.year_to != null && p.year_to !== "") {
      const yt = typeof p.year_to === "number" ? p.year_to : Number(p.year_to);
      if (Number.isFinite(yt)) yearTo = Math.trunc(yt);
    }

    let ref = typeof p.refrigerant_type === "string" ? p.refrigerant_type.trim().toUpperCase() : "UNKNOWN";
    ref = ref.replace(/\s+/g, "");
    const allowed = ["R134A", "R1234YF", "R12", "UNKNOWN"];
    if (!allowed.includes(ref)) ref = "UNKNOWN";
    const refrigerant_type =
      ref === "R134A" ? "R134a" : ref === "R1234YF" ? "R1234yf" : ref === "R12" ? "R12" : "unknown";

    let rw: number | null = null;
    if (p.refrigerant_weight != null && p.refrigerant_weight !== "") {
      const n = typeof p.refrigerant_weight === "number" ? p.refrigerant_weight : Number(p.refrigerant_weight);
      if (Number.isFinite(n) && n > 0) rw = n;
    }

    const oil_type =
      typeof p.oil_type === "string" && p.oil_type.trim() ? p.oil_type.trim() : null;

    let oa: number | null = null;
    if (p.oil_amount != null && p.oil_amount !== "") {
      const n = typeof p.oil_amount === "number" ? p.oil_amount : Number(p.oil_amount);
      if (Number.isFinite(n) && n >= 0) oa = n;
    }

    return {
      make,
      model,
      year_from: Math.trunc(yearFrom),
      year_to: yearTo,
      refrigerant_type,
      refrigerant_weight: rw,
      oil_type,
      oil_amount: oa,
    };
  } catch {
    return null;
  }
}

async function fetchGeminiAcSpecs(make: string, model: string, year: number | null): Promise<AcSpecsAiPayload | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  const user = acUserPrompt(make, model, year);
  for (const modelName of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: AC_SYSTEM }] },
            contents: [{ parts: [{ text: user }] }],
            generationConfig: { temperature: 0.2 },
          }),
        }
      );
      if (!res.ok) continue;
      const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const parsed = parseAcSpecsJson(text);
      if (parsed) return parsed;
    } catch {
      // next model
    }
  }
  return null;
}

async function fetchGroqAcSpecs(make: string, model: string, year: number | null): Promise<AcSpecsAiPayload | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
  const user = acUserPrompt(make, model, year);
  for (const m of models) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: m,
          messages: [
            { role: "system", content: AC_SYSTEM },
            { role: "user", content: user },
          ],
          temperature: 0.2,
        }),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content ?? "";
      const parsed = parseAcSpecsJson(text);
      if (parsed) return parsed;
    } catch {
      // next
    }
  }
  return null;
}

async function fetchOpenAiAcSpecs(make: string, model: string, year: number | null): Promise<AcSpecsAiPayload | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const user = acUserPrompt(make, model, year);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: AC_SYSTEM },
          { role: "user", content: user },
        ],
        temperature: 0.2,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content ?? "";
    return parseAcSpecsJson(text);
  } catch {
    return null;
  }
}

/** يحاول Gemini ثم Groq ثم OpenAI */
export async function fetchAcSpecsWithAi(
  make: string,
  model: string,
  year: number | null
): Promise<AcSpecsAiPayload | null> {
  const g = await fetchGeminiAcSpecs(make, model, year);
  if (g) return g;
  const q = await fetchGroqAcSpecs(make, model, year);
  if (q) return q;
  return fetchOpenAiAcSpecs(make, model, year);
}

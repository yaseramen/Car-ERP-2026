/**
 * جلب مواصفات التكييف عبر نفس مزودي الذكاء الاصطناعي المستخدمين في OBD.
 */

const AC_SYSTEM = `أنت مساعد فني لورش سيارات. أجب بكائن JSON واحد فقط (بدون markdown وبدون نص قبل أو بعد JSON).
الحقول المطلوبة:
- make: اسم الماركة
- model: اسم الموديل أو الفئة
- year_from: سنة بداية تطبيق هذه المواصفات (رقم صحيح). إن لم تكن متأكداً استخدم سنة الصنع التي ذكرها المستخدم إن وُجدت، وإلا تقديراً معقولاً للجيل.
- year_to: سنة نهاية أو null إن استمرت أو غير معروفة
- refrigerant_type: واحدة فقط: R134a | R1234yf | R12 | unknown
- refrigerant_weight: كمية الفريون بالجرام (رقم) أو null
- oil_type: نوع زيت التكييف (مثل PAG 46) أو null
- oil_amount: كمية الزيت بالمليلتر (رقم) أو null

لا تخترع أرقاماً دقيقة للفريون إن لم تكن لديك معرفة معقولة بالطراز؛ استخدم null في الحقل.`;

function acUserPrompt(make: string, model: string, year: number | null): string {
  const y = year != null && Number.isFinite(year) ? String(Math.trunc(year)) : "غير محدد";
  return `مواصفات تكييف الهواء (A/C) للسيارة:
الماركة: ${make}
الموديل: ${model}
سنة الصنع المرجعية للعميل: ${y}

أعد JSON واحداً فقط مثل:
{"make":"Toyota","model":"Corolla","year_from":2014,"year_to":2019,"refrigerant_type":"R134a","refrigerant_weight":450,"oil_type":"PAG 46","oil_amount":120}`;
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

/** يستخرج أول كائن JSON يبدو متوازناً من النص */
function extractJsonObject(text: string): string | null {
  const cleaned = stripJsonFence(text);
  const start = cleaned.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === "\\") {
        esc = true;
        continue;
      }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return cleaned.slice(start, i + 1);
    }
  }
  const loose = cleaned.match(/\{[\s\S]*\}/);
  return loose ? loose[0] : null;
}

function numField(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const t = v.replace(/,/g, ".").replace(/[^\d.-]/g, "").trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function strField(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** يدعم مفاتيح إنجليزية/عربية شائعة من النماذج */
function pickRecord(p: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...p };
  const alias = (from: string, to: string) => {
    if (out[to] == null && out[from] != null) out[to] = out[from];
  };
  alias("Year", "year_from");
  alias("yearFrom", "year_from");
  alias("سنة_البداية", "year_from");
  alias("سنة_من", "year_from");
  alias("year_end", "year_to");
  alias("yearTo", "year_to");
  alias("سنة_النهاية", "year_to");
  alias("سنة_إلى", "year_to");
  alias("refrigerant", "refrigerant_type");
  alias("نوع_الفريون", "refrigerant_type");
  alias("فريون", "refrigerant_type");
  alias("gas_type", "refrigerant_type");
  alias("weight_g", "refrigerant_weight");
  alias("refrigerant_charge_g", "refrigerant_weight");
  alias("كمية_الفريون", "refrigerant_weight");
  alias("كمية_الفريون_جرام", "refrigerant_weight");
  alias("oil", "oil_type");
  alias("نوع_الزيت", "oil_type");
  alias("كمية_الزيت", "oil_amount");
  return out;
}

function normalizeRefrigerant(raw: string): string {
  let ref = raw.trim().toUpperCase().replace(/\s+/g, "").replace(/-/g, "");
  if (ref === "134A" || ref === "R134") ref = "R134A";
  if (ref === "1234YF" || ref === "R1234") ref = "R1234YF";
  const allowed = ["R134A", "R1234YF", "R12", "UNKNOWN"];
  if (!allowed.includes(ref)) ref = "UNKNOWN";
  if (ref === "R134A") return "R134a";
  if (ref === "R1234YF") return "R1234yf";
  if (ref === "R12") return "R12";
  return "unknown";
}

export function parseAcSpecsJson(text: string, customerYear: number | null): AcSpecsAiPayload | null {
  const blob = extractJsonObject(text);
  if (!blob) return null;
  try {
    const raw = JSON.parse(blob) as Record<string, unknown>;
    const p = pickRecord(raw);
    const make = strField(p.make);
    const model = strField(p.model);
    if (!make || !model) return null;

    let yearFrom = numField(p.year_from);
    if (yearFrom == null || !Number.isFinite(yearFrom)) {
      if (customerYear != null && Number.isFinite(customerYear)) yearFrom = Math.trunc(customerYear);
      else yearFrom = new Date().getFullYear();
    }
    yearFrom = Math.trunc(yearFrom);

    let yearTo: number | null = numField(p.year_to);
    if (yearTo != null) yearTo = Math.trunc(yearTo);

    const refrigerant_type = normalizeRefrigerant(strField(p.refrigerant_type) || "unknown");

    let rw = numField(p.refrigerant_weight);
    if (rw != null && rw <= 0) rw = null;

    const oil_type = strField(p.oil_type) || null;

    let oa = numField(p.oil_amount);
    if (oa != null && oa < 0) oa = null;

    return {
      make,
      model,
      year_from: yearFrom,
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

type GeminiGenResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; code?: number };
};

function extractGeminiText(data: GeminiGenResponse): string {
  const parts = data.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  const texts: string[] = [];
  for (const part of parts) {
    if (part && typeof part.text === "string") texts.push(part.text);
  }
  return texts.join("\n").trim();
}

async function fetchGeminiAcSpecs(make: string, model: string, year: number | null): Promise<AcSpecsAiPayload | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  /** ترتيب مطابق لمسارات OBD التي تُثبت عملها على الإنتاج */
  const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash"];
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
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1024,
              responseMimeType: "application/json",
            },
          }),
        }
      );
      if (!res.ok) continue;
      const data = (await res.json()) as GeminiGenResponse;
      if (data.error?.message) continue;
      const text = extractGeminiText(data);
      const parsed = parseAcSpecsJson(text, year);
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
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content ?? "";
      const parsed = parseAcSpecsJson(text, year);
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
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content ?? "";
    return parseAcSpecsJson(text, year);
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

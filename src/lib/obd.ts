import { db } from "@/lib/db/client";
import { randomUUID } from "crypto";

const SYSTEM_COMPANY_ID = "company-system";

export const OBD_SEARCH_COST = 1;

export const OBD_PROMPT = `كود OBD: {code}
أعطني:
1. الوصف (ما يعني هذا الكود)
2. الأسباب المحتملة (كل سبب في سطر، افصل بـ |)
3. الحلول المقترحة (كل حل في سطر، افصل بـ |)
4. الأعراض (كل عرض في سطر، افصل بـ |)
أجب بصيغة JSON فقط: {"description_ar":"...","causes":"...","solutions":"...","symptoms":"..."}`;

export function parseAIResponse(text: string): { description_ar: string; causes: string; solutions: string; symptoms: string } | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as { description_ar: string; causes: string; solutions: string; symptoms: string };
  } catch {
    return null;
  }
}

export async function searchLocal(code: string) {
  const normalized = code.trim().toUpperCase().replace(/\s/g, "");
  const candidates = [normalized];
  const withoutSuffix = normalized.replace(/-\d{2}$/, "");
  if (withoutSuffix !== normalized) candidates.push(withoutSuffix);
  for (const c of candidates) {
    const result = await db.execute({
      sql: "SELECT * FROM obd_codes WHERE UPPER(TRIM(code)) = ? LIMIT 1",
      args: [c],
    });
    if (result.rows[0]) return result.rows[0];
  }
  return null;
}

async function searchWithGemini(code: string): Promise<{ description_ar: string; causes: string; solutions: string; symptoms: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: "أنت خبير في تشخيص أعطال السيارات. أجب بالعربية فقط. قدم الإجابات بصيغة مختصرة وواضحة." }],
            },
            contents: [{ parts: [{ text: OBD_PROMPT.replace("{code}", code) }] }],
            generationConfig: { temperature: 0.3 },
          }),
        }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const parsed = parseAIResponse(text);
      if (parsed) return parsed;
    } catch {
      // try next model
    }
  }
  return null;
}

async function searchWithOpenAI(code: string): Promise<{ description_ar: string; causes: string; solutions: string; symptoms: string } | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "أنت خبير في تشخيص أعطال السيارات. أجب بالعربية فقط. قدم الإجابات بصيغة مختصرة وواضحة." },
          { role: "user", content: OBD_PROMPT.replace("{code}", code) },
        ],
        temperature: 0.3,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    return parseAIResponse(text);
  } catch {
    return null;
  }
}

export async function searchWithAI(code: string): Promise<{ description_ar: string; causes: string; solutions: string; symptoms: string } | null> {
  const gemini = await searchWithGemini(code);
  if (gemini) return gemini;
  return searchWithOpenAI(code);
}

export type ObdResult = {
  code: string;
  description_ar: string | null;
  description_en: string | null;
  causes: string | null;
  solutions: string | null;
  symptoms: string | null;
  source: string;
};

export async function resolveCode(code: string): Promise<{ result: ObdResult; obdCodeId: string | null }> {
  const local = await searchLocal(code);
  let result: ObdResult;
  let obdCodeId: string | null = null;

  if (local) {
    await db.execute({
      sql: "UPDATE obd_codes SET search_count = search_count + 1, updated_at = datetime('now') WHERE id = ?",
      args: [local.id],
    });
    obdCodeId = local.id as string;
    result = {
      code: String(local.code ?? code),
      description_ar: local.description_ar ? String(local.description_ar) : null,
      description_en: local.description_en ? String(local.description_en) : null,
      causes: local.causes ? String(local.causes) : null,
      solutions: local.solutions ? String(local.solutions) : null,
      symptoms: local.symptoms ? String(local.symptoms) : null,
      source: "local",
    };
  } else {
    const aiResult = await searchWithAI(code);
    if (aiResult) {
      obdCodeId = randomUUID();
      await db.execute({
        sql: `INSERT INTO obd_codes (id, company_id, code, description_ar, causes, solutions, symptoms, source)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'ai')`,
        args: [
          obdCodeId,
          SYSTEM_COMPANY_ID,
          code.toUpperCase(),
          aiResult.description_ar || null,
          aiResult.causes || null,
          aiResult.solutions || null,
          aiResult.symptoms || null,
        ],
      });
      result = {
        code: code.toUpperCase(),
        description_ar: aiResult.description_ar || null,
        description_en: null,
        causes: aiResult.causes || null,
        solutions: aiResult.solutions || null,
        symptoms: aiResult.symptoms || null,
        source: "ai",
      };
    } else {
      result = {
        code: code.toUpperCase(),
        description_ar:
          "لم يتم العثور على الكود في القاعدة المحلية. لإضافة نتائج الذكاء الاصطناعي، أضف GEMINI_API_KEY أو OPENAI_API_KEY في إعدادات Vercel.",
        description_en: null,
        causes: null,
        solutions: null,
        symptoms: null,
        source: "not_found",
      };
    }
  }
  return { result, obdCodeId };
}

export const EXTRACT_CODES_PROMPT = `استخرج من هذا التقرير أو الصورة:
1. كل أكواد الأعطال (DTC) بجميع صيغها:
   - صيغة OBD-II القياسية: P0100, P0171, B0001, C1234, U0100 (حرف + 4 أرقام)
   - مع لاحقة: B3902-00, B0223-01, U0184-00
   - 6 أرقام: B250000, B251800, B252000
   - 5 أرقام (كود مصنّع): 01314, 01317, 00898, 01504, 02399, 00532, 00779, 00771, 01305, 01304, 00109, 00332, 01038, 00121, 00944, 01044, 00123, 00103
2. معلومات المركبة إن وُجدت: السلسلة/العلامة، النموذج، السنة، VIN

أجب بصيغة JSON فقط:
{"codes":["P0100","P0171","01314","B3902-00","B250000"],"vehicle":{"brand":"Skoda","model":"","year":2007,"vin":"TMBCA41Z272033398"}}

إذا لم تجد أكواداً: {"codes":[],"vehicle":null}
إذا وجدت أكواداً فقط بدون معلومات مركبة: {"codes":[...],"vehicle":null}
استخرج كل الأكواد التي تظهر في التقرير بغض النظر عن الصيغة.`;

const OBD_CODE_PATTERNS = [
  /^[PBCU]\d{4}$/,           // P0100, B0001
  /^[PBCU]\d{4}-\d{2}$/,     // B3902-00, U0184-00
  /^[PBCU]\d{5,6}$/,         // B250000, B251800
  /^0\d{4}$/,                // 01314, 01317 (VAG/Skoda manufacturer)
];

function isValidObdCode(c: string): boolean {
  const s = String(c).trim().toUpperCase().replace(/\s/g, "");
  if (s.length < 4 || s.length > 10) return false;
  return OBD_CODE_PATTERNS.some((p) => p.test(s));
}

function normalizeCode(c: string): string {
  return String(c).trim().toUpperCase().replace(/\s/g, "");
}

export type ExtractedReport = {
  codes: string[];
  vehicle: { brand: string; model: string; year: number | null; vin: string } | null;
};

export async function extractCodesFromFile(
  base64: string,
  mimeType: string
): Promise<ExtractedReport> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { codes: [], vehicle: null };

  const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
  for (const model of models) {
    try {
      const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [
        { inlineData: { mimeType, data: base64 } },
        { text: EXTRACT_CODES_PROMPT },
      ];

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { temperature: 0.1 },
          }),
        }
      );

      if (!res.ok) continue;
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) continue;
      const parsed = JSON.parse(match[0]) as {
        codes?: string[];
        vehicle?: { brand?: string; model?: string; year?: number; vin?: string } | null;
      };
      const rawCodes = parsed?.codes ?? [];
      const codes = [...new Set(rawCodes.map(normalizeCode).filter(isValidObdCode))];
      const v = parsed?.vehicle;
      const vehicle =
        v && (v.brand || v.model || v.year || v.vin)
          ? {
              brand: String(v.brand ?? "").trim(),
              model: String(v.model ?? "").trim(),
              year: typeof v.year === "number" ? v.year : null,
              vin: String(v.vin ?? "").trim(),
            }
          : null;
      return { codes, vehicle };
    } catch {
      // try next model
    }
  }
  return { codes: [], vehicle: null };
}

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
  const normalized = code.trim().toUpperCase();
  const result = await db.execute({
    sql: "SELECT * FROM obd_codes WHERE UPPER(TRIM(code)) = ? LIMIT 1",
    args: [normalized],
  });
  return result.rows[0] ?? null;
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

export const EXTRACT_CODES_PROMPT = `استخرج كل أكواد OBD من هذا التقرير أو الصورة.
أكواد OBD تبدأ بحرف متبوع بأربعة أرقام، مثل: P0100, P0171, B0001, C1234, U0100.
أجب بصيغة JSON فقط بدون أي نص إضافي: {"codes":["P0100","P0171"]}
إذا لم تجد أي أكواد، أجب: {"codes":[]}`;

export async function extractCodesFromFile(
  base64: string,
  mimeType: string
): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

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
      const parsed = JSON.parse(match[0]) as { codes?: string[] };
      const codes = parsed?.codes;
      if (Array.isArray(codes) && codes.length > 0) {
        return codes
          .map((c) => String(c).trim().toUpperCase())
          .filter((c) => /^[PBCU]\d{4}$/.test(c));
      }
    } catch {
      // try next model
    }
  }
  return [];
}

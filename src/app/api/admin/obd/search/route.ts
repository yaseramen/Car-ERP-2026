import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { randomUUID } from "crypto";

const SYSTEM_COMPANY_ID = "company-system";
const OBD_SEARCH_COST = 1;

async function searchLocal(code: string) {
  const normalized = code.trim().toUpperCase();
  const result = await db.execute({
    sql: "SELECT * FROM obd_codes WHERE UPPER(TRIM(code)) = ? LIMIT 1",
    args: [normalized],
  });
  return result.rows[0] ?? null;
}

const OBD_PROMPT = `كود OBD: {code}
أعطني:
1. الوصف (ما يعني هذا الكود)
2. الأسباب المحتملة (كل سبب في سطر، افصل بـ |)
3. الحلول المقترحة (كل حل في سطر، افصل بـ |)
4. الأعراض (كل عرض في سطر، افصل بـ |)
أجب بصيغة JSON فقط: {"description_ar":"...","causes":"...","solutions":"...","symptoms":"..."}`;

function parseAIResponse(text: string): { description_ar: string; causes: string; solutions: string; symptoms: string } | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as { description_ar: string; causes: string; solutions: string; symptoms: string };
  } catch {
    return null;
  }
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

async function searchWithAI(code: string): Promise<{ description_ar: string; causes: string; solutions: string; symptoms: string } | null> {
  const gemini = await searchWithGemini(code);
  if (gemini) return gemini;
  return searchWithOpenAI(code);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const code = body.code?.trim();
    if (!code) {
      return NextResponse.json({ error: "كود OBD مطلوب" }, { status: 400 });
    }

    const companyCheck = await db.execute({
      sql: "SELECT id FROM companies WHERE id = ?",
      args: [SYSTEM_COMPANY_ID],
    });
    if (companyCheck.rows.length === 0) {
      await db.execute({
        sql: "INSERT INTO companies (id, name, is_active) VALUES (?, 'نظام الأمين', 1)",
        args: [SYSTEM_COMPANY_ID],
      });
    }

    let walletResult = await db.execute({
      sql: "SELECT id, balance FROM company_wallets WHERE company_id = ?",
      args: [SYSTEM_COMPANY_ID],
    });

    if (walletResult.rows.length === 0) {
      await db.execute({
        sql: "INSERT INTO company_wallets (id, company_id, balance, currency) VALUES (?, ?, 0, 'EGP')",
        args: [randomUUID(), SYSTEM_COMPANY_ID],
      });
      walletResult = await db.execute({
        sql: "SELECT id, balance FROM company_wallets WHERE company_id = ?",
        args: [SYSTEM_COMPANY_ID],
      });
    }

    if (walletResult.rows.length === 0 || Number(walletResult.rows[0].balance ?? 0) < OBD_SEARCH_COST) {
      return NextResponse.json(
        { error: `رصيد المحفظة غير كافٍ (تكلفة البحث: ${OBD_SEARCH_COST} ج.م)` },
        { status: 400 }
      );
    }

    const local = await searchLocal(code);
    let result: {
      code: string;
      description_ar: string | null;
      description_en: string | null;
      causes: string | null;
      solutions: string | null;
      symptoms: string | null;
      source: string;
    };
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
          description_ar: "لم يتم العثور على الكود في القاعدة المحلية. لإضافة نتائج الذكاء الاصطناعي، أضف GEMINI_API_KEY أو OPENAI_API_KEY في إعدادات Vercel.",
          description_en: null,
          causes: null,
          solutions: null,
          symptoms: null,
          source: "not_found",
        };
      }
    }

    const walletId = walletResult.rows[0].id;
    const wtId = randomUUID();
    await db.execute({
      sql: "UPDATE company_wallets SET balance = balance - ? WHERE company_id = ?",
      args: [OBD_SEARCH_COST, SYSTEM_COMPANY_ID],
    });
    await db.execute({
      sql: `INSERT INTO wallet_transactions (id, wallet_id, amount, type, description, reference_type, reference_id, performed_by)
            VALUES (?, ?, ?, 'obd_search', ?, 'obd_search', ?, ?)`,
      args: [wtId, walletId, OBD_SEARCH_COST, `بحث OBD - كود ${code.toUpperCase()}`, wtId, session.user.id],
    });

    await db.execute({
      sql: `INSERT INTO obd_searches (id, company_id, code, obd_code_id, wallet_transaction_id, result_summary, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        randomUUID(),
        SYSTEM_COMPANY_ID,
        code.toUpperCase(),
        obdCodeId,
        wtId,
        result.description_ar ?? "",
        session.user.id,
      ],
    });

    return NextResponse.json({
      ...result,
      cost: OBD_SEARCH_COST,
    });
  } catch (error) {
    console.error("OBD search error:", error);
    return NextResponse.json({ error: "فشل في البحث" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { randomUUID } from "crypto";

const SYSTEM_COMPANY_ID = "company-system";
const OBD_SEARCH_COST = 1;

const DESCRIPTION_PROMPT = `أنت خبير ميكانيكي. العميل يصف مشكلة في سيارته بدون استخدام جهاز كشف أعطال.

وصف الحالة: {description}
{vehicleInfo}

أجب بصيغة JSON فقط:
{
  "summary_ar": "ملخص المشكلة المحتملة",
  "possible_codes": ["P0100", "P0171"],
  "causes": "السبب 1|السبب 2|السبب 3",
  "solutions": "الحل 1|الحل 2|الحل 3",
  "recommendations": "نصيحة إضافية"
}`;

async function analyzeWithAI(description: string, vehicleInfo: string): Promise<{
  summary_ar: string;
  possible_codes: string[];
  causes: string;
  solutions: string;
  recommendations: string;
} | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  const prompt = DESCRIPTION_PROMPT.replace("{description}", description).replace("{vehicleInfo}", vehicleInfo);

  if (geminiKey) {
    const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
    for (const model of models) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.3 },
            }),
          }
        );
        if (!res.ok) continue;
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          return {
            summary_ar: parsed.summary_ar ?? "",
            possible_codes: Array.isArray(parsed.possible_codes) ? parsed.possible_codes : [],
            causes: parsed.causes ?? "",
            solutions: parsed.solutions ?? "",
            recommendations: parsed.recommendations ?? "",
          };
        }
      } catch {
        continue;
      }
    }
  }

  if (groqKey) {
    const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
    for (const model of models) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: "أنت خبير ميكانيكي. أجب بالعربية فقط بصيغة JSON." },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
          }),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content ?? "";
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          return {
            summary_ar: parsed.summary_ar ?? "",
            possible_codes: Array.isArray(parsed.possible_codes) ? parsed.possible_codes : [],
            causes: parsed.causes ?? "",
            solutions: parsed.solutions ?? "",
            recommendations: parsed.recommendations ?? "",
          };
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const description = body.description?.trim();
    if (!description) {
      return NextResponse.json({ error: "وصف الحالة مطلوب" }, { status: 400 });
    }

    const vehicleInfo = [
      body.brand && `المركبة: ${body.brand}`,
      body.model && `النموذج: ${body.model}`,
      body.year && `سنة الصنع: ${body.year}`,
    ]
      .filter(Boolean)
      .join("، ");
    const vehicleInfoStr = vehicleInfo ? `معلومات المركبة: ${vehicleInfo}` : "";

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

    const balance = Number(walletResult.rows[0]?.balance ?? 0);
    if (walletResult.rows.length === 0 || balance < OBD_SEARCH_COST) {
      return NextResponse.json(
        { error: `رصيد المحفظة غير كافٍ (${OBD_SEARCH_COST} ج.م)` },
        { status: 400 }
      );
    }

    const result = await analyzeWithAI(description, vehicleInfoStr);
    if (!result) {
      return NextResponse.json(
        { error: "لم يتمكن الذكاء الاصطناعي من التحليل. تأكد من GEMINI_API_KEY أو GROQ_API_KEY." },
        { status: 500 }
      );
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
      args: [wtId, walletId, OBD_SEARCH_COST, `تحليل بالوصف: ${description.slice(0, 50)}...`, wtId, session.user.id],
    });

    return NextResponse.json({
      ...result,
      cost: OBD_SEARCH_COST,
    });
  } catch (error) {
    console.error("OBD analyze-by-description error:", error);
    return NextResponse.json({ error: "فشل في التحليل" }, { status: 500 });
  }
}

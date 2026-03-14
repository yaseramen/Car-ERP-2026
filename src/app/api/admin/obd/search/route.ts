import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { randomUUID } from "crypto";
import { OBD_SEARCH_COST, resolveCode } from "@/lib/obd";

const SYSTEM_COMPANY_ID = "company-system";

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

    const { result, obdCodeId } = await resolveCode(code);

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

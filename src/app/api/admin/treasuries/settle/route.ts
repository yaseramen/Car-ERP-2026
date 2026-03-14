import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { randomUUID } from "crypto";

const SYSTEM_COMPANY_ID = "company-system";
const TREASURY_SALES_ID = "treasury-sales";
const TREASURY_WORKSHOP_ID = "treasury-workshop";
const TREASURY_MAIN_ID = "treasury-main";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { from_date, to_date, note } = body;

    const salesResult = await db.execute({
      sql: "SELECT balance FROM treasuries WHERE id = ? AND company_id = ?",
      args: [TREASURY_SALES_ID, SYSTEM_COMPANY_ID],
    });
    const workshopResult = await db.execute({
      sql: "SELECT balance FROM treasuries WHERE id = ? AND company_id = ?",
      args: [TREASURY_WORKSHOP_ID, SYSTEM_COMPANY_ID],
    });
    const mainResult = await db.execute({
      sql: "SELECT id FROM treasuries WHERE id = ? AND company_id = ?",
      args: [TREASURY_MAIN_ID, SYSTEM_COMPANY_ID],
    });

    if (salesResult.rows.length === 0 || workshopResult.rows.length === 0) {
      return NextResponse.json({ error: "الخزائن غير موجودة" }, { status: 400 });
    }

    if (mainResult.rows.length === 0) {
      return NextResponse.json({ error: "الخزينة الرئيسية غير موجودة. شغّل الـ migration أولاً." }, { status: 400 });
    }

    const salesBalance = Number(salesResult.rows[0].balance ?? 0);
    const workshopBalance = Number(workshopResult.rows[0].balance ?? 0);
    const total = salesBalance + workshopBalance;

    if (total <= 0) {
      return NextResponse.json({ error: "لا يوجد رصيد للتسليم" }, { status: 400 });
    }

    const desc = note?.trim() || `تسليم نهاية الفترة ${from_date || ""} - ${to_date || ""}`.trim() || "تسليم إلى الخزينة الرئيسية";
    const txId = randomUUID();

    if (salesBalance > 0) {
      await db.execute({
        sql: "UPDATE treasuries SET balance = balance - ?, updated_at = datetime('now') WHERE id = ?",
        args: [salesBalance, TREASURY_SALES_ID],
      });
      await db.execute({
        sql: `INSERT INTO treasury_transactions (id, treasury_id, amount, type, description, reference_type, reference_id, performed_by)
              VALUES (?, ?, ?, 'out', ?, 'settlement', ?, ?)`,
        args: [randomUUID(), TREASURY_SALES_ID, -salesBalance, desc, txId, session.user.id],
      });
    }

    if (workshopBalance > 0) {
      await db.execute({
        sql: "UPDATE treasuries SET balance = balance - ?, updated_at = datetime('now') WHERE id = ?",
        args: [workshopBalance, TREASURY_WORKSHOP_ID],
      });
      await db.execute({
        sql: `INSERT INTO treasury_transactions (id, treasury_id, amount, type, description, reference_type, reference_id, performed_by)
              VALUES (?, ?, ?, 'out', ?, 'settlement', ?, ?)`,
        args: [randomUUID(), TREASURY_WORKSHOP_ID, -workshopBalance, desc, txId, session.user.id],
      });
    }

    await db.execute({
      sql: "UPDATE treasuries SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?",
      args: [total, TREASURY_MAIN_ID],
    });
    await db.execute({
      sql: `INSERT INTO treasury_transactions (id, treasury_id, amount, type, description, reference_type, reference_id, performed_by)
            VALUES (?, ?, ?, 'in', ?, 'settlement', ?, ?)`,
      args: [randomUUID(), TREASURY_MAIN_ID, total, desc, txId, session.user.id],
    });

    return NextResponse.json({
      success: true,
      sales_transferred: salesBalance,
      workshop_transferred: workshopBalance,
      total_transferred: total,
    });
  } catch (error) {
    console.error("Settle error:", error);
    return NextResponse.json({ error: "فشل في التسليم" }, { status: 500 });
  }
}

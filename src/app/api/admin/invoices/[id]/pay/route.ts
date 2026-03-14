import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { randomUUID } from "crypto";
import { ensureTreasuries, getTreasuryIdByType } from "@/lib/treasuries";

const SYSTEM_COMPANY_ID = "company-system";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id: invoiceId } = await params;

  try {
    const body = await request.json();
    const { amount, payment_method_id, reference_number, notes } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "المبلغ مطلوب ويجب أن يكون أكبر من صفر" }, { status: 400 });
    }
    if (!payment_method_id) {
      return NextResponse.json({ error: "طريقة الدفع مطلوبة" }, { status: 400 });
    }

    const amt = Number(amount);

    const invResult = await db.execute({
      sql: "SELECT total, paid_amount, status, type, invoice_number FROM invoices WHERE id = ? AND company_id = ?",
      args: [invoiceId, SYSTEM_COMPANY_ID],
    });

    if (invResult.rows.length === 0) {
      return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
    }

    const inv = invResult.rows[0];
    const total = Number(inv.total ?? 0);
    const paidAmount = Number(inv.paid_amount ?? 0);
    const newPaid = paidAmount + amt;
    const invType = String(inv.type ?? "");
    const invNum = String(inv.invoice_number ?? "");

    if (newPaid > total) {
      return NextResponse.json({ error: `المبلغ يتجاوز المتبقي (${(total - paidAmount).toFixed(2)} ج.م)` }, { status: 400 });
    }

    const status = newPaid >= total ? "paid" : "partial";

    let treasuryId: string | null = null;
    if (invType === "sale" || invType === "maintenance") {
      await ensureTreasuries();
      treasuryId = invType === "sale" ? getTreasuryIdByType("sales") : getTreasuryIdByType("workshop");
    }

    if (treasuryId) {
      await db.execute({
        sql: "UPDATE treasuries SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?",
        args: [amt, treasuryId],
      });
      await db.execute({
        sql: `INSERT INTO treasury_transactions (id, treasury_id, amount, type, description, reference_type, reference_id, payment_method_id, performed_by)
              VALUES (?, ?, ?, 'in', ?, 'invoice', ?, ?, ?)`,
        args: [randomUUID(), treasuryId, amt, `دفعة فاتورة ${invNum}`, invoiceId, payment_method_id, session.user.id],
      });
    }

    await db.execute({
      sql: "INSERT INTO invoice_payments (id, invoice_id, amount, payment_method_id, treasury_id, reference_number, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [
        randomUUID(),
        invoiceId,
        amt,
        payment_method_id,
        treasuryId,
        reference_number?.trim() || null,
        notes?.trim() || null,
        session.user.id,
      ],
    });

    await db.execute({
      sql: "UPDATE invoices SET paid_amount = ?, status = ?, updated_at = datetime('now') WHERE id = ? AND company_id = ?",
      args: [newPaid, status, invoiceId, SYSTEM_COMPANY_ID],
    });

    return NextResponse.json({ success: true, paid_amount: newPaid, status });
  } catch (error) {
    console.error("Payment error:", error);
    return NextResponse.json({ error: "فشل في تسجيل الدفع" }, { status: 500 });
  }
}

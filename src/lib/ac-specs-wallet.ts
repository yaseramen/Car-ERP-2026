import { db } from "@/lib/db/client";
import { randomUUID } from "crypto";

/** تكلفة كل استعلام تكييف (محفظة الشركة المرتبطة بالمستخدم) */
export const AC_SPECS_LOOKUP_COST_EGP = 1;

const CHARGE_DESC = "رسوم استعلام فني - تكييف";

export type AcSpecsChargeOk = { walletId: string; transactionId: string };
export type AcSpecsChargeResult =
  | { ok: true; data: AcSpecsChargeOk }
  | { ok: false; error: "insufficient" };

async function ensureCompanyWallet(companyId: string): Promise<{ id: string; balance: number }> {
  let r = await db.execute({
    sql: "SELECT id, balance FROM company_wallets WHERE company_id = ?",
    args: [companyId],
  });
  if (r.rows.length === 0) {
    const wid = randomUUID();
    await db.execute({
      sql: "INSERT INTO company_wallets (id, company_id, balance, currency) VALUES (?, ?, 0, 'EGP')",
      args: [wid, companyId],
    });
    r = await db.execute({
      sql: "SELECT id, balance FROM company_wallets WHERE company_id = ?",
      args: [companyId],
    });
  }
  const row = r.rows[0];
  return { id: String(row?.id ?? ""), balance: Number(row?.balance ?? 0) };
}

/**
 * يخصم 1 ج.م من محفظة الشركة (رصيد المستخدم/الشركة في النظام).
 * رسالة الرفض للواجهة: «رصيدك غير كافٍ»
 */
export async function chargeAcSpecsLookup(companyId: string, userId: string): Promise<AcSpecsChargeResult> {
  const { id: walletId, balance } = await ensureCompanyWallet(companyId);
  if (balance < AC_SPECS_LOOKUP_COST_EGP) {
    return { ok: false, error: "insufficient" };
  }

  const txId = randomUUID();
  const upd = await db.execute({
    sql: `UPDATE company_wallets SET balance = balance - ?, updated_at = datetime('now')
          WHERE id = ? AND balance >= ?`,
    args: [AC_SPECS_LOOKUP_COST_EGP, walletId, AC_SPECS_LOOKUP_COST_EGP],
  });
  const rowsAffected = "rowsAffected" in upd ? (upd as { rowsAffected: number }).rowsAffected : 0;
  if (rowsAffected === 0) {
    return { ok: false, error: "insufficient" };
  }

  await db.execute({
    sql: `INSERT INTO wallet_transactions (id, wallet_id, amount, type, description, reference_type, reference_id, performed_by)
          VALUES (?, ?, ?, 'ac_specs_lookup', ?, 'ac_specs_lookup', ?, ?)`,
    args: [txId, walletId, AC_SPECS_LOOKUP_COST_EGP, CHARGE_DESC, txId, userId],
  });

  return { ok: true, data: { walletId, transactionId: txId } };
}

/** استرداد الرسوم عند فشل جلب البيانات بعد الخصم (مثلاً فشل الذكاء الاصطناعي) */
export async function refundAcSpecsLookup(walletId: string, originalTxId: string, userId: string): Promise<void> {
  const refundId = randomUUID();
  await db.execute({
    sql: `UPDATE company_wallets SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?`,
    args: [AC_SPECS_LOOKUP_COST_EGP, walletId],
  });
  await db.execute({
    sql: `INSERT INTO wallet_transactions (id, wallet_id, amount, type, description, reference_type, reference_id, performed_by)
          VALUES (?, ?, ?, 'credit', ?, 'ac_specs_lookup_refund', ?, ?)`,
    args: [
      refundId,
      walletId,
      AC_SPECS_LOOKUP_COST_EGP,
      `استرداد — ${CHARGE_DESC}`,
      originalTxId,
      userId,
    ],
  });
}

import { db } from "@/lib/db/client";

const SYSTEM_COMPANY_ID = "company-system";
const TREASURY_SALES_ID = "treasury-sales";
const TREASURY_WORKSHOP_ID = "treasury-workshop";

export async function ensureTreasuries() {
  const existing = await db.execute({
    sql: "SELECT id FROM treasuries WHERE company_id = ?",
    args: [SYSTEM_COMPANY_ID],
  });

  if (existing.rows.length >= 2) return;

  const companyExisting = await db.execute({
    sql: "SELECT id FROM companies WHERE id = ?",
    args: [SYSTEM_COMPANY_ID],
  });
  if (companyExisting.rows.length === 0) {
    await db.execute({
      sql: "INSERT INTO companies (id, name, is_active) VALUES (?, 'نظام الأمين', 1)",
      args: [SYSTEM_COMPANY_ID],
    });
  }

  const salesExists = existing.rows.some((r) => r.id === TREASURY_SALES_ID);
  if (!salesExists) {
    await db.execute({
      sql: "INSERT INTO treasuries (id, company_id, name, type, balance) VALUES (?, ?, 'خزينة المبيعات', 'sales', 0)",
      args: [TREASURY_SALES_ID, SYSTEM_COMPANY_ID],
    });
  }

  const workshopExists = existing.rows.some((r) => r.id === TREASURY_WORKSHOP_ID);
  if (!workshopExists) {
    await db.execute({
      sql: "INSERT INTO treasuries (id, company_id, name, type, balance) VALUES (?, ?, 'خزينة الورشة', 'workshop', 0)",
      args: [TREASURY_WORKSHOP_ID, SYSTEM_COMPANY_ID],
    });
  }
}

export function getTreasuryIdByType(type: "sales" | "workshop"): string {
  return type === "sales" ? TREASURY_SALES_ID : TREASURY_WORKSHOP_ID;
}

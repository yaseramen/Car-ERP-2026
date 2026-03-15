import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { getCompanyId } from "@/lib/company";

const ALLOWED_ROLES = ["super_admin", "tenant_owner"] as const;

export async function GET() {
  const session = await auth();
  const companyId = getCompanyId(session);
  if (!session?.user || !companyId || !ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const result = await db.execute({
    sql: "SELECT id, name, phone, address, tax_number, commercial_registration FROM companies WHERE id = ?",
    args: [companyId],
  });
  if (result.rows.length === 0) {
    return NextResponse.json({ error: "الشركة غير موجودة" }, { status: 404 });
  }

  const row = result.rows[0];
  return NextResponse.json({
    id: row.id,
    name: row.name ?? "",
    phone: row.phone ?? "",
    address: row.address ?? "",
    tax_number: row.tax_number ?? "",
    commercial_registration: row.commercial_registration ?? "",
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  const companyId = getCompanyId(session);
  if (!session?.user || !companyId || !ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const body = await request.json();
  const { name, phone, address, tax_number, commercial_registration } = body;

  const updates: string[] = [];
  const args: (string | number | null)[] = [];

  if (typeof name === "string" && name.trim()) {
    updates.push("name = ?");
    args.push(name.trim());
  }
  if (typeof phone === "string") {
    updates.push("phone = ?");
    args.push(phone.trim() || null);
  }
  if (typeof address === "string") {
    updates.push("address = ?");
    args.push(address.trim() || null);
  }
  if (typeof tax_number === "string") {
    updates.push("tax_number = ?");
    args.push(tax_number.trim() || null);
  }
  if (typeof commercial_registration === "string") {
    updates.push("commercial_registration = ?");
    args.push(commercial_registration.trim() || null);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "لا توجد بيانات للتحديث" }, { status: 400 });
  }

  updates.push("updated_at = datetime('now')");
  args.push(companyId);

  await db.execute({
    sql: `UPDATE companies SET ${updates.join(", ")} WHERE id = ?`,
    args,
  });

  return NextResponse.json({ ok: true, message: "تم تحديث بيانات الشركة" });
}

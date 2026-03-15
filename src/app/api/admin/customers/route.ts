import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { getCompanyId } from "@/lib/company";
import { ensureCompanyWarehouse } from "@/lib/warehouse";
import { randomUUID } from "crypto";

const ALLOWED_ROLES = ["super_admin", "tenant_owner", "employee"] as const;

export async function GET() {
  const session = await auth();
  const companyId = getCompanyId(session);
  if (!session?.user || !companyId || !ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const result = await db.execute({
      sql: `SELECT id, name, phone, email, address, notes, created_at
            FROM customers
            WHERE company_id = ? AND is_active = 1
            ORDER BY name`,
      args: [companyId],
    });

    const customers = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone ?? null,
      email: row.email ?? null,
      address: row.address ?? null,
      notes: row.notes ?? null,
      created_at: row.created_at,
    }));

    return NextResponse.json(customers);
  } catch (error) {
    console.error("Customers GET error:", error);
    return NextResponse.json({ error: "فشل في جلب البيانات" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const companyId = getCompanyId(session);
  if (!session?.user || !companyId || !ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    await ensureCompanyWarehouse(companyId);
    const body = await request.json();
    const { name, phone, email, address, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "اسم العميل مطلوب" }, { status: 400 });
    }

    const phoneNorm = phone?.trim() || null;
    if (phoneNorm) {
      const existingPhone = await db.execute({
        sql: "SELECT id FROM customers WHERE company_id = ? AND phone = ?",
        args: [companyId, phoneNorm],
      });
      if (existingPhone.rows.length > 0) {
        return NextResponse.json({ error: "رقم الهاتف مستخدم لعميل آخر" }, { status: 400 });
      }
    }

    const id = randomUUID();

    await db.execute({
      sql: `INSERT INTO customers (id, company_id, name, phone, email, address, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        companyId,
        name.trim(),
        phoneNorm,
        email?.trim() || null,
        address?.trim() || null,
        notes?.trim() || null,
      ],
    });

    const newCustomer = await db.execute({
      sql: "SELECT id, name, phone, email, address, notes, created_at FROM customers WHERE id = ?",
      args: [id],
    });

    const row = newCustomer.rows[0];
    return NextResponse.json({
      id: row.id,
      name: row.name,
      phone: row.phone ?? null,
      email: row.email ?? null,
      address: row.address ?? null,
      notes: row.notes ?? null,
      created_at: row.created_at,
    });
  } catch (error) {
    console.error("Customer POST error:", error);
    return NextResponse.json({ error: "فشل في حفظ العميل" }, { status: 500 });
  }
}

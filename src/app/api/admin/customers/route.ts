import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { randomUUID } from "crypto";

const SYSTEM_COMPANY_ID = "company-system";

async function ensureSystemCompany() {
  const existing = await db.execute({
    sql: "SELECT id FROM companies WHERE id = ?",
    args: [SYSTEM_COMPANY_ID],
  });
  if (existing.rows.length > 0) return;
  await db.execute({
    sql: "INSERT INTO companies (id, name, is_active) VALUES (?, 'نظام الأمين', 1)",
    args: [SYSTEM_COMPANY_ID],
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const result = await db.execute({
      sql: `SELECT id, name, phone, email, address, notes, created_at
            FROM customers
            WHERE company_id = ? AND is_active = 1
            ORDER BY name`,
      args: [SYSTEM_COMPANY_ID],
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
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, phone, email, address, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "اسم العميل مطلوب" }, { status: 400 });
    }

    await ensureSystemCompany();
    const id = randomUUID();

    await db.execute({
      sql: `INSERT INTO customers (id, company_id, name, phone, email, address, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        SYSTEM_COMPANY_ID,
        name.trim(),
        phone?.trim() || null,
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

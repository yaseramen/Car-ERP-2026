import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const result = await db.execute({
      sql: `SELECT c.id, c.name, c.phone, c.address,
            COALESCE(cw.id, '') as wallet_id,
            COALESCE(cw.balance, 0) as balance
            FROM companies c
            LEFT JOIN company_wallets cw ON c.id = cw.company_id
            WHERE c.is_active = 1
            ORDER BY c.name`,
    });

    const companies = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      address: row.address,
      wallet_id: row.wallet_id || null,
      balance: Number(row.balance ?? 0),
    }));

    return NextResponse.json(companies);
  } catch (error) {
    console.error("Companies GET error:", error);
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
    const { name, phone, address } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "اسم الشركة مطلوب" }, { status: 400 });
    }

    const companyId = randomUUID();
    const walletId = randomUUID();

    await db.execute({
      sql: "INSERT INTO companies (id, name, phone, address, is_active) VALUES (?, ?, ?, ?, 1)",
      args: [companyId, name.trim(), phone?.trim() || null, address?.trim() || null],
    });

    await db.execute({
      sql: "INSERT INTO company_wallets (id, company_id, balance, currency) VALUES (?, ?, 0, 'EGP')",
      args: [walletId, companyId],
    });

    return NextResponse.json({
      id: companyId,
      name: name.trim(),
      phone: phone?.trim() || null,
      address: address?.trim() || null,
      wallet_id: walletId,
      balance: 0,
    });
  } catch (error) {
    console.error("Company POST error:", error);
    return NextResponse.json({ error: "فشل في إنشاء الشركة" }, { status: 500 });
  }
}

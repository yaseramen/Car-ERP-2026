import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "@/lib/db/client";

type BusinessType = "sales_only" | "service_only" | "both";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, phone, company_name, business_type } = body;

    if (!email || !password || !name || !company_name) {
      return NextResponse.json(
        { error: "البريد، كلمة المرور، الاسم، واسم الشركة مطلوبة" },
        { status: 400 }
      );
    }

    const bt: BusinessType = ["sales_only", "service_only", "both"].includes(business_type)
      ? business_type
      : "both";

    if (String(password).length < 6) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, { status: 400 });
    }

    const emailNorm = String(email).toLowerCase().trim();
    const existingUser = await db.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [emailNorm],
    });
    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: "البريد الإلكتروني مستخدم مسبقاً" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(String(password), 12);
    const companyId = randomUUID();
    const userId = randomUUID();

    await db.execute({
      sql: `INSERT INTO companies (id, name, phone, business_type, is_active)
            VALUES (?, ?, ?, ?, 1)`,
      args: [companyId, String(company_name).trim(), phone ? String(phone) : null, bt],
    });

    await db.execute({
      sql: `INSERT INTO users (id, company_id, email, password_hash, name, phone, role, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 'tenant_owner', 1)`,
      args: [userId, companyId, emailNorm, passwordHash, String(name).trim(), phone ? String(phone) : null],
    });

    const WELCOME_GIFT = 50;
    const walletId = randomUUID();
    await db.execute({
      sql: `INSERT INTO company_wallets (id, company_id, balance, currency)
            VALUES (?, ?, ?, 'EGP')`,
      args: [walletId, companyId, WELCOME_GIFT],
    });
    await db.execute({
      sql: `INSERT INTO wallet_transactions (id, wallet_id, amount, type, description, performed_by)
            VALUES (?, ?, ?, 'credit', ?, ?)`,
      args: [randomUUID(), walletId, WELCOME_GIFT, `هدية اشتراك - ${WELCOME_GIFT} ج.م`, userId],
    });

    return NextResponse.json({
      ok: true,
      message: "تم إنشاء الحساب بنجاح. يمكنك تسجيل الدخول الآن.",
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء التسجيل" }, { status: 500 });
  }
}

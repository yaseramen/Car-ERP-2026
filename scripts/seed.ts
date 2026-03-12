/**
 * Seed Script - إضافة Super Admin
 * Run: SEED_SUPER_ADMIN_PASSWORD=yourpassword npm run db:seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "../src/lib/db/client";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "santws1@gmail.com";
const SEED_PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD;

async function seed() {
  if (!SEED_PASSWORD) {
    console.error("❌ يجب تعيين SEED_SUPER_ADMIN_PASSWORD في البيئة");
    console.log("مثال: SEED_SUPER_ADMIN_PASSWORD=YourSecurePass123 npm run db:seed");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
  const userId = randomUUID();

  // التحقق إن كان المستخدم موجوداً
  const existing = await db.execute({
    sql: "SELECT id FROM users WHERE email = ?",
    args: [SUPER_ADMIN_EMAIL],
  });

  if (existing.rows.length > 0) {
    // تحديث كلمة المرور إن وُجد
    await db.execute({
      sql: "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE email = ?",
      args: [passwordHash, SUPER_ADMIN_EMAIL],
    });
    console.log("✅ تم تحديث كلمة مرور Super Admin:", SUPER_ADMIN_EMAIL);
  } else {
    await db.execute({
      sql: `INSERT INTO users (id, company_id, email, password_hash, name, role, is_active)
            VALUES (?, NULL, ?, ?, 'Super Admin', 'super_admin', 1)`,
      args: [userId, SUPER_ADMIN_EMAIL, passwordHash],
    });
    console.log("✅ تم إنشاء Super Admin:", SUPER_ADMIN_EMAIL);
  }

  console.log("يمكنك الآن تسجيل الدخول باستخدام البريد وكلمة المرور المحددة.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });

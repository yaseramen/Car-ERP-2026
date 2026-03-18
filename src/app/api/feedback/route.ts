import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { getCompanyId } from "@/lib/company";
import { randomUUID } from "crypto";

const ALLOWED_ROLES = ["super_admin", "tenant_owner", "employee"] as const;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
  }

  const companyId = getCompanyId(session);
  if (!companyId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    const body = await request.json();
    const type = ["feedback", "feature", "bug"].includes(body.type) ? body.type : "feedback";
    const title = String(body.title ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!title || !message) {
      return NextResponse.json({ error: "العنوان والرسالة مطلوبان" }, { status: 400 });
    }

    if (message.length > 5000) {
      return NextResponse.json({ error: "الرسالة طويلة جداً" }, { status: 400 });
    }

    const id = randomUUID();
    await db.execute({
      sql: `INSERT INTO user_feedback (id, user_id, company_id, type, title, message, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      args: [id, session.user.id!, companyId, type, title, message],
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Feedback POST error:", error);
    return NextResponse.json({ error: "فشل في إرسال الملاحظة" }, { status: 500 });
  }
}

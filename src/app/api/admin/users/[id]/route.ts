import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import bcrypt from "bcryptjs";

const SYSTEM_COMPANY_ID = "company-system";

function getCompanyId(session: { user?: { role?: string; companyId?: string | null; id?: string } }): string | null {
  if (session.user?.role === "super_admin") return SYSTEM_COMPANY_ID;
  return session.user?.companyId ?? null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !["super_admin", "tenant_owner"].includes(session.user.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const companyId = getCompanyId(session);
  if (!companyId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;

  try {
    const result = await db.execute({
      sql: "SELECT id, email, name, phone, role, is_active, is_blocked FROM users WHERE id = ? AND company_id = ?",
      args: [id, companyId],
    });

    const row = result.rows[0];
    if (!row) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

    return NextResponse.json({
      id: String(row.id ?? ""),
      email: String(row.email ?? ""),
      name: String(row.name ?? ""),
      phone: row.phone ? String(row.phone) : null,
      role: String(row.role ?? ""),
      is_active: Number(row.is_active ?? 1) === 1,
      is_blocked: Number(row.is_blocked ?? 0) === 1,
    });
  } catch (error) {
    console.error("User GET error:", error);
    return NextResponse.json({ error: "فشل في جلب البيانات" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !["super_admin", "tenant_owner"].includes(session.user.role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const companyId = getCompanyId(session);
  if (!companyId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  if (id === session.user?.id) {
    return NextResponse.json({ error: "لا يمكن تعديل حسابك" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updates: string[] = [];
    const args: (string | number)[] = [];

    if (body.name !== undefined) {
      updates.push("name = ?");
      args.push(String(body.name).trim());
    }
    if (body.phone !== undefined) {
      updates.push("phone = ?");
      args.push(body.phone ? String(body.phone) : "");
    }
    if (body.password !== undefined && String(body.password).length >= 6) {
      const hash = await bcrypt.hash(String(body.password), 12);
      updates.push("password_hash = ?");
      args.push(hash);
    }
    if (body.is_blocked !== undefined) {
      updates.push("is_blocked = ?");
      args.push(body.is_blocked ? 1 : 0);
      if (body.is_blocked) {
        updates.push("blocked_at = ?");
        updates.push("blocked_by = ?");
        args.push(new Date().toISOString().slice(0, 19).replace("T", " "));
        args.push(session.user?.id ?? "");
      } else {
        updates.push("blocked_at = NULL");
        updates.push("blocked_by = NULL");
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "لا يوجد تحديث" }, { status: 400 });
    }

    updates.push("updated_at = datetime('now')");
    args.push(id, companyId);

    await db.execute({
      sql: `UPDATE users SET ${updates.join(", ")} WHERE id = ? AND company_id = ?`,
      args,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("User PATCH error:", error);
    return NextResponse.json({ error: "فشل في التحديث" }, { status: 500 });
  }
}

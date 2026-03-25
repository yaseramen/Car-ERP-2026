import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit";

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

/**
 * حذف موظف نهائياً — للمالك فقط؛ لا يمكن حذف المالك أو سوبر الإدارة على شركة النظام هنا.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "tenant_owner") {
    return NextResponse.json({ error: "غير مصرح — الحذف النهائي للمالك فقط" }, { status: 403 });
  }

  const companyId = session.user.companyId ?? null;
  if (!companyId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id: targetId } = await params;
  if (targetId === session.user.id) {
    return NextResponse.json({ error: "لا يمكن حذف حسابك" }, { status: 400 });
  }

  try {
    const target = await db.execute({
      sql: "SELECT id, email, name, role FROM users WHERE id = ? AND company_id = ?",
      args: [targetId, companyId],
    });
    if (target.rows.length === 0) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }
    if (String(target.rows[0].role ?? "") !== "employee") {
      return NextResponse.json({ error: "يمكن حذف الموظفين فقط" }, { status: 400 });
    }

    const ownerId = session.user.id;
    const label = `${target.rows[0].name} (${target.rows[0].email})`;

    await db.execute({
      sql: "UPDATE users SET blocked_by = NULL WHERE blocked_by = ?",
      args: [targetId],
    });
    await db.execute({
      sql: "UPDATE tenant_password_reset_codes SET created_by_super_admin_id = NULL WHERE created_by_super_admin_id = ?",
      args: [targetId],
    });

    const reassignTables = [
      ["wallet_transactions", "performed_by"],
      ["treasury_transactions", "performed_by"],
      ["stock_movements", "performed_by"],
      ["invoices", "created_by"],
      ["invoice_payments", "created_by"],
      ["repair_orders", "created_by"],
      ["obd_searches", "created_by"],
      ["obd_reports", "created_by"],
    ] as const;
    for (const [table, col] of reassignTables) {
      try {
        await db.execute({
          sql: `UPDATE ${table} SET ${col} = ? WHERE ${col} = ?`,
          args: [ownerId, targetId],
        });
      } catch {
        /* جدول قد لا يوجد في نسخ قديمة */
      }
    }

    await db.execute({
      sql: "DELETE FROM users WHERE id = ? AND company_id = ?",
      args: [targetId, companyId],
    });

    await logAudit({
      companyId,
      userId: session.user.id,
      userName: session.user.name ?? session.user.email ?? undefined,
      action: "user_delete",
      entityType: "user",
      entityId: targetId,
      details: `حذف نهائي لموظف: ${label}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("User DELETE error:", error);
    return NextResponse.json({ error: "فشل الحذف — قد تكون هناك بيانات مرتبطة" }, { status: 500 });
  }
}

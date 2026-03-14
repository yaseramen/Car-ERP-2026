import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";

const SYSTEM_COMPANY_ID = "company-system";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, phone, email, address, notes } = body;

    const updates: string[] = ["updated_at = datetime('now')"];
    const args: (string | null)[] = [];

    if (name !== undefined) {
      if (!name?.trim()) {
        return NextResponse.json({ error: "اسم المورد مطلوب" }, { status: 400 });
      }
      updates.push("name = ?");
      args.push(name.trim());
    }
    if (phone !== undefined) {
      updates.push("phone = ?");
      args.push(phone?.trim() || null);
    }
    if (email !== undefined) {
      updates.push("email = ?");
      args.push(email?.trim() || null);
    }
    if (address !== undefined) {
      updates.push("address = ?");
      args.push(address?.trim() || null);
    }
    if (notes !== undefined) {
      updates.push("notes = ?");
      args.push(notes?.trim() || null);
    }

    if (updates.length <= 1) {
      return NextResponse.json({ error: "لا توجد بيانات للتحديث" }, { status: 400 });
    }

    args.push(id, SYSTEM_COMPANY_ID);

    await db.execute({
      sql: `UPDATE suppliers SET ${updates.join(", ")} WHERE id = ? AND company_id = ?`,
      args: args as string[],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Supplier update error:", error);
    return NextResponse.json({ error: "فشل في التحديث" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const usedInInvoices = await db.execute({
      sql: "SELECT 1 FROM invoices WHERE supplier_id = ? LIMIT 1",
      args: [id],
    });

    if (usedInInvoices.rows.length > 0) {
      await db.execute({
        sql: "UPDATE suppliers SET is_active = 0, updated_at = datetime('now') WHERE id = ? AND company_id = ?",
        args: [id, SYSTEM_COMPANY_ID],
      });
      return NextResponse.json({ success: true, message: "تم تعطيل المورد (مستخدم سابقاً)" });
    }

    await db.execute({
      sql: "DELETE FROM suppliers WHERE id = ? AND company_id = ?",
      args: [id, SYSTEM_COMPANY_ID],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Supplier delete error:", error);
    return NextResponse.json({ error: "فشل في الحذف" }, { status: 500 });
  }
}

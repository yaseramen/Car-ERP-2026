import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";

const EXCLUDED_IDS = ["company-system", "company-demo"];

/** حظر أو إلغاء حظر الشركة */
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id } = await params;
  if (EXCLUDED_IDS.includes(id)) {
    return NextResponse.json({ error: "لا يمكن تعديل هذه الشركة" }, { status: 400 });
  }

  try {
    const body = await _request.json().catch(() => ({}));
    const is_active = body.is_active === true ? 1 : body.is_active === false ? 0 : undefined;
    if (is_active === undefined) {
      return NextResponse.json({ error: "is_active مطلوب (true أو false)" }, { status: 400 });
    }

    const res = await db.execute({
      sql: "UPDATE companies SET is_active = ?, updated_at = datetime('now') WHERE id = ?",
      args: [is_active, id],
    });
    const rowsAffected = "rowsAffected" in res ? (res as { rowsAffected: number }).rowsAffected : 0;
    if (rowsAffected === 0) {
      return NextResponse.json({ error: "الشركة غير موجودة" }, { status: 404 });
    }
    return NextResponse.json({ success: true, is_active: is_active === 1 });
  } catch (error) {
    console.error("Company block error:", error);
    return NextResponse.json({ error: "فشل في التعديل" }, { status: 500 });
  }
}

/** حذف الشركة وجميع بياناتها — يُسمح بإعادة التسجيل لاحقاً */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id } = await params;
  if (EXCLUDED_IDS.includes(id)) {
    return NextResponse.json({ error: "لا يمكن حذف هذه الشركة" }, { status: 400 });
  }

  try {
    await db.execute({ sql: "DELETE FROM companies WHERE id = ?", args: [id] });
    return NextResponse.json({ success: true, message: "تم حذف الشركة وكل بياناتها. يمكن للأعضاء إعادة التسجيل." });
  } catch (error) {
    console.error("Company delete error:", error);
    return NextResponse.json({ error: "فشل في الحذف" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";

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
    const status = ["pending", "read", "resolved"].includes(body.status) ? body.status : null;
    if (!status) {
      return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
    }

    await db.execute({
      sql: "UPDATE user_feedback SET status = ?, updated_at = datetime('now') WHERE id = ?",
      args: [status, id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback PATCH error:", error);
    return NextResponse.json({ error: "فشل في التحديث" }, { status: 500 });
  }
}

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
    const { min_quantity, min_quantity_enabled } = body;

    const minQty = min_quantity_enabled ? Number(min_quantity) || 0 : 0;

    await db.execute({
      sql: "UPDATE items SET min_quantity = ?, updated_at = datetime('now') WHERE id = ? AND company_id = ?",
      args: [minQty, id, SYSTEM_COMPANY_ID],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Item update error:", error);
    return NextResponse.json({ error: "فشل في التحديث" }, { status: 500 });
  }
}

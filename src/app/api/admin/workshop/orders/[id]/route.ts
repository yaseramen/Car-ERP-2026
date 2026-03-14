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
    const { stage, inspection_notes, estimated_completion } = body;

    const stages = ["received", "inspection", "maintenance", "ready", "completed"];
    if (!stage || !stages.includes(stage)) {
      return NextResponse.json({ error: "مرحلة غير صالحة" }, { status: 400 });
    }

    const updates: string[] = ["stage = ?", "updated_at = datetime('now')"];
    const args: (string | number | null)[] = [stage];

    if (inspection_notes !== undefined) {
      updates.push("inspection_notes = ?");
      args.push(inspection_notes);
    }
    if (estimated_completion !== undefined) {
      updates.push("estimated_completion = ?");
      args.push(estimated_completion);
    }
    if (stage === "completed") {
      updates.push("completed_at = datetime('now')");
    }

    args.push(id, SYSTEM_COMPANY_ID);

    await db.execute({
      sql: `UPDATE repair_orders SET ${updates.join(", ")} WHERE id = ? AND company_id = ?`,
      args: args as (string | number)[],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Order update error:", error);
    return NextResponse.json({ error: "فشل في التحديث" }, { status: 500 });
  }
}

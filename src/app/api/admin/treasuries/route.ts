import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { ensureTreasuries } from "@/lib/treasuries";

const SYSTEM_COMPANY_ID = "company-system";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    await ensureTreasuries();

    const result = await db.execute({
      sql: "SELECT id, name, type, balance FROM treasuries WHERE company_id = ? AND is_active = 1 ORDER BY type",
      args: [SYSTEM_COMPANY_ID],
    });

    const treasuries = result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      balance: Number(r.balance ?? 0),
    }));

    return NextResponse.json(treasuries);
  } catch (error) {
    console.error("Treasuries GET error:", error);
    return NextResponse.json({ error: "فشل في جلب البيانات" }, { status: 500 });
  }
}

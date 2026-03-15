import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { ensureTreasuries } from "@/lib/treasuries";
import { getCompanyId } from "@/lib/company";

export async function GET() {
  const session = await auth();
  if (!session?.user || !["super_admin", "tenant_owner", "employee"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const companyId = getCompanyId(session);
  if (!companyId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    await ensureTreasuries(companyId);

    const result = await db.execute({
      sql: "SELECT id, name, type, balance FROM treasuries WHERE company_id = ? AND is_active = 1 ORDER BY type",
      args: [companyId],
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

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { getCompanyId } from "@/lib/company";

const ALLOWED_ROLES = ["super_admin", "tenant_owner", "employee"] as const;

export async function GET() {
  const session = await auth();
  const companyId = getCompanyId(session);
  if (!session?.user || !companyId || !ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const result = await db.execute({
      sql: `SELECT i.id, i.name, i.min_quantity,
            COALESCE((SELECT SUM(quantity) FROM item_warehouse_stock WHERE item_id = i.id), 0) as quantity
            FROM items i
            WHERE i.company_id = ? AND i.is_active = 1 AND i.min_quantity > 0
            AND COALESCE((SELECT SUM(quantity) FROM item_warehouse_stock WHERE item_id = i.id), 0) < i.min_quantity
            ORDER BY quantity ASC`,
      args: [companyId],
    });

    const all = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      min_quantity: Number(row.min_quantity ?? 0),
      quantity: Number(row.quantity ?? 0),
    }));

    const lowStock = all.filter((i) => i.quantity < i.min_quantity * 0.8);
    const approaching = all.filter((i) => i.quantity >= i.min_quantity * 0.8);

    return NextResponse.json({ lowStock, approaching });
  } catch (error) {
    console.error("Low stock GET error:", error);
    return NextResponse.json({ error: "فشل في جلب البيانات" }, { status: 500 });
  }
}

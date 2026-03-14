import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";

const SYSTEM_COMPANY_ID = "company-system";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

  try {
    const lowStockResult = await db.execute({
      sql: `SELECT i.id, i.name, i.code, i.min_quantity,
            COALESCE((SELECT SUM(quantity) FROM item_warehouse_stock WHERE item_id = i.id), 0) as quantity
            FROM items i
            WHERE i.company_id = ? AND i.is_active = 1 AND i.min_quantity > 0
            AND COALESCE((SELECT SUM(quantity) FROM item_warehouse_stock WHERE item_id = i.id), 0) < i.min_quantity
            ORDER BY quantity ASC`,
      args: [SYSTEM_COMPANY_ID],
    });

    const movementsResult = await db.execute({
      sql: `SELECT sm.id, sm.quantity, sm.movement_type, sm.reference_type, sm.created_at,
            i.name as item_name
            FROM stock_movements sm
            JOIN items i ON sm.item_id = i.id
            WHERE i.company_id = ?
            ORDER BY sm.created_at DESC
            LIMIT ?`,
      args: [SYSTEM_COMPANY_ID, limit],
    });

    const lowStock = lowStockResult.rows.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      min_quantity: Number(r.min_quantity ?? 0),
      quantity: Number(r.quantity ?? 0),
    }));

    const movements = movementsResult.rows.map((r) => ({
      id: r.id,
      item_name: String(r.item_name ?? ""),
      quantity: Number(r.quantity ?? 0),
      movement_type: String(r.movement_type ?? ""),
      reference_type: r.reference_type ? String(r.reference_type) : null,
      created_at: r.created_at,
    }));

    return NextResponse.json({ lowStock, movements });
  } catch (error) {
    console.error("Inventory report error:", error);
    return NextResponse.json({ error: "فشل في جلب البيانات" }, { status: 500 });
  }
}

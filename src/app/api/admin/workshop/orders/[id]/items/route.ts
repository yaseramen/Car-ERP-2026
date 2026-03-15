import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { getCompanyId } from "@/lib/company";
import { randomUUID } from "crypto";

const ALLOWED_ROLES = ["super_admin", "tenant_owner", "employee"] as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const companyId = getCompanyId(session);
  if (!session?.user || !companyId || !ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await db.execute({
      sql: `SELECT roi.*, i.name as item_name, i.unit as item_unit
            FROM repair_order_items roi
            JOIN items i ON roi.item_id = i.id
            WHERE roi.repair_order_id = ?`,
      args: [id],
    });

    const items = result.rows.map((row) => ({
      id: row.id,
      item_id: row.item_id,
      item_name: row.item_name,
      item_unit: row.item_unit,
      quantity: row.quantity,
      unit_price: row.unit_price,
      total: row.total,
    }));

    return NextResponse.json(items);
  } catch (error) {
    console.error("Order items GET error:", error);
    return NextResponse.json({ error: "فشل في جلب البيانات" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const companyId = getCompanyId(session);
  if (!session?.user || !companyId || !ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id: orderId } = await params;

  try {
    const body = await request.json();
    const { item_id, quantity } = body;

    if (!item_id || !quantity || Number(quantity) <= 0) {
      return NextResponse.json({ error: "الصنف والكمية مطلوبان" }, { status: 400 });
    }

    const qty = Number(quantity);

    const orderResult = await db.execute({
      sql: "SELECT id, warehouse_id, stage FROM repair_orders WHERE id = ? AND company_id = ?",
      args: [orderId, companyId],
    });

    if (orderResult.rows.length === 0) {
      return NextResponse.json({ error: "أمر الإصلاح غير موجود" }, { status: 404 });
    }

    const order = orderResult.rows[0];
    const stage = order.stage as string;
    if (stage !== "maintenance" && stage !== "ready") {
      return NextResponse.json(
        { error: "يمكن إضافة القطع فقط في مرحلة الصيانة أو الجاهزة" },
        { status: 400 }
      );
    }

    const warehouseId = order.warehouse_id as string;

    const stockResult = await db.execute({
      sql: "SELECT quantity FROM item_warehouse_stock WHERE item_id = ? AND warehouse_id = ?",
      args: [item_id, warehouseId],
    });

    const available = stockResult.rows[0]
      ? Number(stockResult.rows[0].quantity ?? 0)
      : 0;

    if (available < qty) {
      return NextResponse.json(
        { error: `الكمية المتاحة: ${available}` },
        { status: 400 }
      );
    }

    const itemResult = await db.execute({
      sql: "SELECT sale_price FROM items WHERE id = ? AND company_id = ?",
      args: [item_id, companyId],
    });

    if (itemResult.rows.length === 0) {
      return NextResponse.json({ error: "الصنف غير موجود" }, { status: 404 });
    }

    const unitPrice = Number(itemResult.rows[0].sale_price ?? 0);
    const total = qty * unitPrice;

    const roiId = randomUUID();
    const smId = randomUUID();

    await db.execute({
      sql: "INSERT INTO stock_movements (id, item_id, warehouse_id, quantity, movement_type, reference_type, reference_id, performed_by) VALUES (?, ?, ?, ?, 'workshop_install', 'repair_order', ?, ?)",
      args: [smId, item_id, warehouseId, qty, orderId, session.user.id],
    });

    await db.execute({
      sql: "UPDATE item_warehouse_stock SET quantity = quantity - ?, updated_at = datetime('now') WHERE item_id = ? AND warehouse_id = ?",
      args: [qty, item_id, warehouseId],
    });

    await db.execute({
      sql: "INSERT INTO repair_order_items (id, repair_order_id, item_id, warehouse_id, quantity, unit_price, total, stock_movement_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [roiId, orderId, item_id, warehouseId, qty, unitPrice, total, smId],
    });

    const newItem = await db.execute({
      sql: `SELECT roi.*, i.name as item_name FROM repair_order_items roi JOIN items i ON roi.item_id = i.id WHERE roi.id = ?`,
      args: [roiId],
    });

    const row = newItem.rows[0];
    return NextResponse.json({
      id: row.id,
      item_id: row.item_id,
      item_name: row.item_name,
      quantity: row.quantity,
      unit_price: row.unit_price,
      total: row.total,
    });
  } catch (error) {
    console.error("Add item error:", error);
    return NextResponse.json({ error: "فشل في إضافة القطعة" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { getCompanyId } from "@/lib/company";
import { ensureCompanyWarehouse } from "@/lib/warehouse";
import { randomUUID } from "crypto";

const ALLOWED_ROLES = ["super_admin", "tenant_owner", "employee"] as const;

/**
 * تعديل يدوي للكمية (جرد) - يُنشئ حركة من نوع adjustment
 * Body: { new_quantity: number, warehouse_id?: string, notes?: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const companyId = getCompanyId(session);
  if (!session?.user || !companyId || !ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id: itemId } = await params;

  try {
    const body = await request.json();
    const newQuantity = Number(body.new_quantity);
    const notes = typeof body.notes === "string" ? body.notes.trim() : undefined;

    if (Number.isNaN(newQuantity) || newQuantity < 0) {
      return NextResponse.json({ error: "الكمية الجديدة يجب أن تكون رقماً موجباً" }, { status: 400 });
    }

    const itemResult = await db.execute({
      sql: "SELECT id FROM items WHERE id = ? AND company_id = ?",
      args: [itemId, companyId],
    });
    if (itemResult.rows.length === 0) {
      return NextResponse.json({ error: "الصنف غير موجود" }, { status: 404 });
    }

    const warehouseId = body.warehouse_id
      ? String(body.warehouse_id)
      : await ensureCompanyWarehouse(companyId);

    const stockResult = await db.execute({
      sql: "SELECT id, quantity FROM item_warehouse_stock WHERE item_id = ? AND warehouse_id = ?",
      args: [itemId, warehouseId],
    });

    const currentQty = stockResult.rows.length > 0 ? Number(stockResult.rows[0].quantity ?? 0) : 0;
    const delta = newQuantity - currentQty;

    if (delta === 0) {
      return NextResponse.json({ success: true, message: "الكمية مطابقة، لا حاجة للتعديل" });
    }

    const smId = randomUUID();

    if (stockResult.rows.length > 0) {
      await db.execute({
        sql: "UPDATE item_warehouse_stock SET quantity = ?, updated_at = datetime('now') WHERE item_id = ? AND warehouse_id = ?",
        args: [newQuantity, itemId, warehouseId],
      });
    } else {
      await db.execute({
        sql: "INSERT INTO item_warehouse_stock (id, item_id, warehouse_id, quantity) VALUES (?, ?, ?, ?)",
        args: [randomUUID(), itemId, warehouseId, newQuantity],
      });
    }

    await db.execute({
      sql: `INSERT INTO stock_movements (id, item_id, warehouse_id, quantity, movement_type, reference_type, reference_id, notes, performed_by)
            VALUES (?, ?, ?, ?, 'adjustment', 'manual', ?, ?, ?)`,
      args: [smId, itemId, warehouseId, delta, smId, notes || "تعديل يدوي (جرد)", session.user.id],
    });

    return NextResponse.json({
      success: true,
      previous_quantity: currentQty,
      new_quantity: newQuantity,
      delta,
    });
  } catch (error) {
    console.error("Stock adjustment error:", error);
    return NextResponse.json({ error: "فشل في تعديل الكمية" }, { status: 500 });
  }
}

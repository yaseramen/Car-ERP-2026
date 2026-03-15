import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { getCompanyId } from "@/lib/company";
import { ensureCompanyWarehouse } from "@/lib/warehouse";
import { randomUUID } from "crypto";

const ALLOWED_ROLES = ["super_admin", "tenant_owner", "employee"] as const;

function generateBarcode() {
  return "BC" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function GET() {
  const session = await auth();
  const companyId = getCompanyId(session);
  if (!session?.user || !companyId || !ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const result = await db.execute({
      sql: `SELECT id, name, code, barcode, category, unit, purchase_price, sale_price, min_quantity,
            COALESCE((SELECT SUM(quantity) FROM item_warehouse_stock WHERE item_id = items.id), 0) as quantity
            FROM items 
            WHERE company_id = ? AND is_active = 1 
            ORDER BY created_at DESC`,
      args: [companyId],
    });

    const items = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      barcode: row.barcode,
      category: row.category,
      unit: row.unit || "قطعة",
      purchase_price: row.purchase_price ?? 0,
      sale_price: row.sale_price ?? 0,
      min_quantity: row.min_quantity ?? 0,
      quantity: row.quantity ?? 0,
    }));

    return NextResponse.json(items);
  } catch (error) {
    console.error("Inventory GET error:", error);
    return NextResponse.json({ error: "فشل في جلب البيانات" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const companyId = getCompanyId(session);
  if (!session?.user || !companyId || !ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const body = await request.json();
    let { name, code, barcode, category, unit, purchase_price, sale_price, min_quantity, min_quantity_enabled } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "اسم القطعة مطلوب" }, { status: 400 });
    }

    const warehouseId = await ensureCompanyWarehouse(companyId);
    const id = randomUUID();

    let autoCode = code?.trim() || "";
    if (autoCode) {
      const existingCode = await db.execute({
        sql: "SELECT id FROM items WHERE company_id = ? AND code = ?",
        args: [companyId, autoCode],
      });
      if (existingCode.rows.length > 0) {
        return NextResponse.json({ error: "كود المنتج مستخدم لصنف آخر" }, { status: 400 });
      }
    } else {
      const countResult = await db.execute({
        sql: "SELECT COUNT(*) as cnt FROM items WHERE company_id = ?",
        args: [companyId],
      });
      const count = (countResult.rows[0]?.cnt as number) ?? 0;
      autoCode = `PRD-${String(count + 1).padStart(4, "0")}`;
    }
    const autoBarcode = barcode?.trim() || generateBarcode();

    const minQty = min_quantity_enabled ? Number(min_quantity) || 0 : 0;

    await db.execute({
      sql: `INSERT INTO items (id, company_id, name, code, barcode, category, unit, purchase_price, sale_price, min_quantity)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        companyId,
        name.trim(),
        autoCode,
        autoBarcode,
        category?.trim() || null,
        unit?.trim() || "قطعة",
        Number(purchase_price) || 0,
        Number(sale_price) || 0,
        minQty,
      ],
    });

    await db.execute({
      sql: "INSERT INTO item_warehouse_stock (id, item_id, warehouse_id, quantity) VALUES (?, ?, ?, 0)",
      args: [randomUUID(), id, warehouseId],
    });

    const newItem = await db.execute({
      sql: `SELECT id, name, code, barcode, category, unit, purchase_price, sale_price, min_quantity, 0 as quantity
            FROM items WHERE id = ?`,
      args: [id],
    });

    const row = newItem.rows[0];
    return NextResponse.json({
      id: row.id,
      name: row.name,
      code: row.code,
      barcode: row.barcode,
      category: row.category,
      unit: row.unit || "قطعة",
      purchase_price: row.purchase_price ?? 0,
      sale_price: row.sale_price ?? 0,
      min_quantity: row.min_quantity ?? 0,
      quantity: 0,
    });
  } catch (error) {
    console.error("Inventory POST error:", error);
    return NextResponse.json({ error: "فشل في حفظ الصنف" }, { status: 500 });
  }
}

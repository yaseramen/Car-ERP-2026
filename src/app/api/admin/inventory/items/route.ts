import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { randomUUID } from "crypto";

const SYSTEM_COMPANY_ID = "company-system";
const SYSTEM_WAREHOUSE_ID = "warehouse-system";

async function ensureSystemCompany() {
  const existing = await db.execute({
    sql: "SELECT id FROM companies WHERE id = ?",
    args: [SYSTEM_COMPANY_ID],
  });
  if (existing.rows.length > 0) return SYSTEM_COMPANY_ID;

  await db.execute({
    sql: "INSERT INTO companies (id, name, is_active) VALUES (?, ?, 1)",
    args: [SYSTEM_COMPANY_ID, "نظام الأمين"],
  });

  await db.execute({
    sql: "INSERT INTO warehouses (id, company_id, name, type, is_active) VALUES (?, ?, ?, 'main', 1)",
    args: [SYSTEM_WAREHOUSE_ID, SYSTEM_COMPANY_ID, "المخزن الرئيسي"],
  });

  return SYSTEM_COMPANY_ID;
}

async function ensureWarehouse() {
  const existing = await db.execute({
    sql: "SELECT id FROM warehouses WHERE id = ?",
    args: [SYSTEM_WAREHOUSE_ID],
  });
  if (existing.rows.length > 0) return SYSTEM_WAREHOUSE_ID;
  await ensureSystemCompany();
  return SYSTEM_WAREHOUSE_ID;
}

function generateBarcode() {
  return "BC" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const result = await db.execute({
      sql: `SELECT id, name, code, barcode, category, unit, purchase_price, sale_price, 
            COALESCE((SELECT SUM(quantity) FROM item_warehouse_stock WHERE item_id = items.id), 0) as quantity
            FROM items 
            WHERE company_id = ? AND is_active = 1 
            ORDER BY created_at DESC`,
      args: [SYSTEM_COMPANY_ID],
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
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const body = await request.json();
    let { name, code, barcode, category, unit, purchase_price, sale_price } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "اسم القطعة مطلوب" }, { status: 400 });
    }

    const companyId = await ensureSystemCompany();
    const warehouseId = await ensureWarehouse();
    const id = randomUUID();

    const countResult = await db.execute({
      sql: "SELECT COUNT(*) as cnt FROM items WHERE company_id = ?",
      args: [SYSTEM_COMPANY_ID],
    });
    const count = (countResult.rows[0]?.cnt as number) ?? 0;
    const autoCode = code?.trim() || `PRD-${String(count + 1).padStart(4, "0")}`;
    const autoBarcode = barcode?.trim() || generateBarcode();

    await db.execute({
      sql: `INSERT INTO items (id, company_id, name, code, barcode, category, unit, purchase_price, sale_price)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ],
    });

    await db.execute({
      sql: "INSERT INTO item_warehouse_stock (id, item_id, warehouse_id, quantity) VALUES (?, ?, ?, 0)",
      args: [randomUUID(), id, warehouseId],
    });

    const newItem = await db.execute({
      sql: `SELECT id, name, code, barcode, category, unit, purchase_price, sale_price, 0 as quantity
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
      quantity: 0,
    });
  } catch (error) {
    console.error("Inventory POST error:", error);
    return NextResponse.json({ error: "فشل في حفظ الصنف" }, { status: 500 });
  }
}

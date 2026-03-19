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

export async function GET(request: Request) {
  const session = await auth();
  const companyId = getCompanyId(session);
  if (!session?.user || !companyId || !ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const usePagination = searchParams.has("limit") || searchParams.has("offset") || searchParams.get("search");
  const limit = usePagination ? Math.min(200, Math.max(1, Number(searchParams.get("limit")) || 50)) : 10000;
  const offset = usePagination ? Math.max(0, Number(searchParams.get("offset")) || 0) : 0;
  const search = searchParams.get("search")?.trim() || "";

  try {
    let sql = `SELECT id, name, code, barcode, category, unit, purchase_price, sale_price, min_quantity,
            COALESCE((SELECT SUM(quantity) FROM item_warehouse_stock WHERE item_id = items.id), 0) as quantity
            FROM items 
            WHERE company_id = ? AND is_active = 1`;
    const args: (string | number)[] = [companyId];
    if (search) {
      sql += ` AND (LOWER(name) LIKE ? OR LOWER(COALESCE(code,'')) LIKE ? OR LOWER(COALESCE(barcode,'')) LIKE ? OR LOWER(COALESCE(category,'')) LIKE ?)`;
      const q = `%${search.toLowerCase()}%`;
      args.push(q, q, q, q);
    }
    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    args.push(limit, offset);

    let total = 0;
    if (usePagination) {
      const countResult = await db.execute({
        sql: `SELECT COUNT(*) as cnt FROM items WHERE company_id = ? AND is_active = 1${search ? ` AND (LOWER(name) LIKE ? OR LOWER(COALESCE(code,'')) LIKE ? OR LOWER(COALESCE(barcode,'')) LIKE ? OR LOWER(COALESCE(category,'')) LIKE ?)` : ""}`,
        args: search ? [companyId, `%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`] : [companyId],
      });
      total = Number(countResult.rows[0]?.cnt ?? 0);
    }

    const result = await db.execute({ sql, args });

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

    if (usePagination) return NextResponse.json({ items, total });
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

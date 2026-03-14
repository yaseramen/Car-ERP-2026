import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { randomUUID } from "crypto";

const SYSTEM_COMPANY_ID = "company-system";
const SYSTEM_WAREHOUSE_ID = "warehouse-system";

async function ensureWarehouse() {
  const existing = await db.execute({
    sql: "SELECT id FROM warehouses WHERE id = ?",
    args: [SYSTEM_WAREHOUSE_ID],
  });
  if (existing.rows.length > 0) return SYSTEM_WAREHOUSE_ID;

  const companyExisting = await db.execute({
    sql: "SELECT id FROM companies WHERE id = ?",
    args: [SYSTEM_COMPANY_ID],
  });
  if (companyExisting.rows.length === 0) {
    await db.execute({
      sql: "INSERT INTO companies (id, name, is_active) VALUES (?, 'نظام الأمين', 1)",
      args: [SYSTEM_COMPANY_ID],
    });
  }
  await db.execute({
    sql: "INSERT INTO warehouses (id, company_id, name, type, is_active) VALUES (?, ?, 'المخزن الرئيسي', 'main', 1)",
    args: [SYSTEM_WAREHOUSE_ID, SYSTEM_COMPANY_ID],
  });
  return SYSTEM_WAREHOUSE_ID;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { supplier_id, items, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "يجب إضافة صنف واحد على الأقل" }, { status: 400 });
    }

    const warehouseId = await ensureWarehouse();

    for (const it of items) {
      if (!it.item_id || !it.quantity || Number(it.quantity) <= 0) {
        return NextResponse.json({ error: "بيانات الصنف غير صالحة" }, { status: 400 });
      }
    }

    const purCountResult = await db.execute({
      sql: "SELECT COUNT(*) as cnt FROM invoices WHERE company_id = ? AND type = 'purchase'",
      args: [SYSTEM_COMPANY_ID],
    });
    const purCount = (purCountResult.rows[0]?.cnt as number) ?? 0;
    const invNum = `PUR-${String(purCount + 1).padStart(4, "0")}`;
    const invoiceId = randomUUID();

    let subtotal = 0;
    const validItems: { item_id: string; quantity: number; unit_price: number; total: number }[] = [];

    for (const it of items) {
      const itemId = it.item_id;
      const qty = Number(it.quantity);
      const unitPrice = Number(it.unit_price) || 0;
      const total = qty * unitPrice;
      subtotal += total;

      const itemResult = await db.execute({
        sql: "SELECT id FROM items WHERE id = ? AND company_id = ?",
        args: [itemId, SYSTEM_COMPANY_ID],
      });
      if (itemResult.rows.length === 0) {
        return NextResponse.json({ error: "صنف غير موجود" }, { status: 404 });
      }

      validItems.push({ item_id: itemId, quantity: qty, unit_price: unitPrice, total });
    }

    await db.execute({
      sql: `INSERT INTO invoices (id, company_id, invoice_number, type, status, supplier_id, warehouse_id, subtotal, total, paid_amount, notes, created_by)
            VALUES (?, ?, ?, 'purchase', 'pending', ?, ?, ?, ?, 0, ?, ?)`,
      args: [
        invoiceId,
        SYSTEM_COMPANY_ID,
        invNum,
        supplier_id?.trim() || null,
        warehouseId,
        subtotal,
        subtotal,
        notes?.trim() || null,
        session.user.id,
      ],
    });

    for (let i = 0; i < validItems.length; i++) {
      const it = validItems[i];
      const smId = randomUUID();
      const iiId = randomUUID();

      await db.execute({
        sql: `INSERT INTO stock_movements (id, item_id, warehouse_id, quantity, movement_type, reference_type, reference_id, performed_by)
              VALUES (?, ?, ?, ?, 'in', 'invoice', ?, ?)`,
        args: [smId, it.item_id, warehouseId, it.quantity, invoiceId, session.user.id],
      });

      const stockExisting = await db.execute({
        sql: "SELECT id, quantity FROM item_warehouse_stock WHERE item_id = ? AND warehouse_id = ?",
        args: [it.item_id, warehouseId],
      });

      if (stockExisting.rows.length > 0) {
        await db.execute({
          sql: "UPDATE item_warehouse_stock SET quantity = quantity + ?, updated_at = datetime('now') WHERE item_id = ? AND warehouse_id = ?",
          args: [it.quantity, it.item_id, warehouseId],
        });
      } else {
        await db.execute({
          sql: "INSERT INTO item_warehouse_stock (id, item_id, warehouse_id, quantity) VALUES (?, ?, ?, ?)",
          args: [randomUUID(), it.item_id, warehouseId, it.quantity],
        });
      }

      await db.execute({
        sql: "INSERT INTO invoice_items (id, invoice_id, item_id, quantity, unit_price, total, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [iiId, invoiceId, it.item_id, it.quantity, it.unit_price, it.total, i],
      });
    }

    return NextResponse.json({
      id: invoiceId,
      invoice_number: invNum,
      total: subtotal,
    });
  } catch (error) {
    console.error("Purchase invoice error:", error);
    return NextResponse.json({ error: "فشل في إنشاء فاتورة الشراء" }, { status: 500 });
  }
}

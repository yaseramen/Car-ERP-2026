import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { getCompanyId } from "@/lib/company";
import { ensureCompanyWarehouse } from "@/lib/warehouse";
import { randomUUID } from "crypto";

const ALLOWED_ROLES = ["super_admin", "tenant_owner", "employee"] as const;

export async function POST(request: Request) {
  const session = await auth();
  const companyId = getCompanyId(session);
  if (!session?.user || !companyId || !ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { supplier_id, items, notes, discount, tax } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "يجب إضافة صنف واحد على الأقل" }, { status: 400 });
    }

    const warehouseId = await ensureCompanyWarehouse(companyId);

    for (const it of items) {
      if (!it.item_id || !it.quantity || Number(it.quantity) <= 0) {
        return NextResponse.json({ error: "بيانات الصنف غير صالحة" }, { status: 400 });
      }
    }

    const purCountResult = await db.execute({
      sql: "SELECT COUNT(*) as cnt FROM invoices WHERE company_id = ? AND type = 'purchase'",
      args: [companyId],
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
        args: [itemId, companyId],
      });
      if (itemResult.rows.length === 0) {
        return NextResponse.json({ error: "صنف غير موجود" }, { status: 404 });
      }

      validItems.push({ item_id: itemId, quantity: qty, unit_price: unitPrice, total });
    }

    const discountAmount = Number(discount) || 0;
    const taxAmount = Number(tax) || 0;
    const afterDiscount = Math.max(0, subtotal - discountAmount);
    const finalTotal = afterDiscount + taxAmount;

    await db.execute({
      sql: `INSERT INTO invoices (id, company_id, invoice_number, type, status, supplier_id, warehouse_id, subtotal, discount, tax, total, paid_amount, notes, created_by)
            VALUES (?, ?, ?, 'purchase', 'pending', ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      args: [
        invoiceId,
        companyId,
        invNum,
        supplier_id?.trim() || null,
        warehouseId,
        subtotal,
        discountAmount,
        taxAmount,
        finalTotal,
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
      total: finalTotal,
    });
  } catch (error) {
    console.error("Purchase invoice error:", error);
    return NextResponse.json({ error: "فشل في إنشاء فاتورة الشراء" }, { status: 500 });
  }
}

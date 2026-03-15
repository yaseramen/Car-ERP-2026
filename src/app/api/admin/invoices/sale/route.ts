import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { getCompanyId } from "@/lib/company";
import { ensureCompanyWarehouse } from "@/lib/warehouse";
import { ensureTreasuries, getTreasuryIdByType } from "@/lib/treasuries";
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
    const {
      customer_id,
      items,
      payment_method_id,
      paid_amount,
      notes,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "يجب إضافة صنف واحد على الأقل" }, { status: 400 });
    }

    const warehouseId = await ensureCompanyWarehouse(companyId);

    for (const it of items) {
      if (!it.item_id || !it.quantity || Number(it.quantity) <= 0) {
        return NextResponse.json({ error: "بيانات الصنف غير صالحة" }, { status: 400 });
      }
    }

    const invCountResult = await db.execute({
      sql: "SELECT COUNT(*) as cnt FROM invoices WHERE company_id = ?",
      args: [companyId],
    });
    const invCount = (invCountResult.rows[0]?.cnt as number) ?? 0;
    const invNum = `INV-${String(invCount + 1).padStart(4, "0")}`;
    const invoiceId = randomUUID();

    let subtotal = 0;
    const validItems: { item_id: string; quantity: number; unit_price: number; total: number; name: string }[] = [];

    for (const it of items) {
      const itemId = it.item_id;
      const qty = Number(it.quantity);

      const stockResult = await db.execute({
        sql: "SELECT quantity FROM item_warehouse_stock WHERE item_id = ? AND warehouse_id = ?",
        args: [itemId, warehouseId],
      });
      const available = stockResult.rows[0] ? Number(stockResult.rows[0].quantity ?? 0) : 0;

      if (available < qty) {
        const itemNameResult = await db.execute({
          sql: "SELECT name FROM items WHERE id = ?",
          args: [itemId],
        });
        const itemName = itemNameResult.rows[0]?.name ?? "صنف";
        return NextResponse.json(
          { error: `الكمية المتاحة لـ "${itemName}" غير كافية (متاح: ${available})` },
          { status: 400 }
        );
      }

      const itemResult = await db.execute({
        sql: "SELECT sale_price, name FROM items WHERE id = ? AND company_id = ?",
        args: [itemId, companyId],
      });
      if (itemResult.rows.length === 0) {
        return NextResponse.json({ error: "صنف غير موجود" }, { status: 404 });
      }

      const unitPrice = Number(itemResult.rows[0].sale_price ?? 0);
      const total = qty * unitPrice;
      subtotal += total;
      validItems.push({
        item_id: itemId,
        quantity: qty,
        unit_price: unitPrice,
        total,
        name: String(itemResult.rows[0].name ?? ""),
      });
    }

    const digitalFee = Math.max(0.5, subtotal * 0.0001);
    const total = subtotal + digitalFee;
    const paid = Number(paid_amount ?? 0);
    const status = paid >= total ? "paid" : paid > 0 ? "partial" : "pending";

    await db.execute({
      sql: `INSERT INTO invoices (id, company_id, invoice_number, type, status, customer_id, warehouse_id, subtotal, digital_service_fee, total, paid_amount, notes, created_by)
            VALUES (?, ?, ?, 'sale', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        invoiceId,
        companyId,
        invNum,
        status,
        customer_id?.trim() || null,
        warehouseId,
        subtotal,
        digitalFee,
        total,
        paid,
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
              VALUES (?, ?, ?, ?, 'out', 'invoice', ?, ?)`,
        args: [smId, it.item_id, warehouseId, -it.quantity, invoiceId, session.user.id],
      });

      await db.execute({
        sql: "UPDATE item_warehouse_stock SET quantity = quantity - ?, updated_at = datetime('now') WHERE item_id = ? AND warehouse_id = ?",
        args: [it.quantity, it.item_id, warehouseId],
      });

      await db.execute({
        sql: "INSERT INTO invoice_items (id, invoice_id, item_id, quantity, unit_price, total, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [iiId, invoiceId, it.item_id, it.quantity, it.unit_price, it.total, i],
      });
    }

    if (paid > 0 && payment_method_id) {
      let treasuryId: string | null = null;
      await ensureTreasuries(companyId);
      treasuryId = await getTreasuryIdByType(companyId, "sales");

      if (treasuryId) {
        await db.execute({
          sql: "UPDATE treasuries SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?",
          args: [paid, treasuryId],
        });
        await db.execute({
          sql: `INSERT INTO treasury_transactions (id, treasury_id, amount, type, description, reference_type, reference_id, payment_method_id, performed_by)
                VALUES (?, ?, ?, 'in', ?, 'invoice', ?, ?, ?)`,
          args: [randomUUID(), treasuryId, paid, `فاتورة بيع ${invNum}`, invoiceId, payment_method_id, session.user.id],
        });
      }

      await db.execute({
        sql: `INSERT INTO invoice_payments (id, invoice_id, amount, payment_method_id, treasury_id, created_by)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [randomUUID(), invoiceId, paid, payment_method_id, treasuryId, session.user.id],
      });
    }

    const walletResult = await db.execute({
      sql: "SELECT id, balance FROM company_wallets WHERE company_id = ?",
      args: [companyId],
    });
    if (walletResult.rows.length > 0 && Number(walletResult.rows[0].balance ?? 0) >= digitalFee) {
      await db.execute({
        sql: "UPDATE company_wallets SET balance = balance - ? WHERE company_id = ?",
        args: [digitalFee, companyId],
      });
      await db.execute({
        sql: `INSERT INTO wallet_transactions (id, wallet_id, amount, type, description, reference_type, reference_id, performed_by)
              VALUES (?, ?, ?, 'digital_service', ?, 'invoice', ?, ?)`,
        args: [randomUUID(), walletResult.rows[0].id, digitalFee, `خدمة رقمية - فاتورة ${invNum}`, invoiceId, session.user.id],
      });
    }

    return NextResponse.json({
      id: invoiceId,
      invoice_number: invNum,
      total,
      status,
    });
  } catch (error) {
    console.error("Sale invoice error:", error);
    return NextResponse.json({ error: "فشل في إنشاء الفاتورة" }, { status: 500 });
  }
}

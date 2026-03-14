import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { randomUUID } from "crypto";

const SYSTEM_COMPANY_ID = "company-system";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id: invoiceId } = await params;

  try {
    const invResult = await db.execute({
      sql: "SELECT id, invoice_number, type, status, warehouse_id, subtotal, digital_service_fee FROM invoices WHERE id = ? AND company_id = ?",
      args: [invoiceId, SYSTEM_COMPANY_ID],
    });

    if (invResult.rows.length === 0) {
      return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
    }

    const inv = invResult.rows[0];
    const status = String(inv.status ?? "");
    const invType = String(inv.type ?? "");

    if (status === "returned") {
      return NextResponse.json({ error: "الفاتورة مرتجعة مسبقاً" }, { status: 400 });
    }

    if (status === "cancelled") {
      return NextResponse.json({ error: "الفاتورة ملغاة" }, { status: 400 });
    }

    const warehouseId = inv.warehouse_id as string;
    if (!warehouseId) {
      return NextResponse.json({ error: "الفاتورة لا تحتوي على مخزن مرتبط" }, { status: 400 });
    }

    const itemsResult = await db.execute({
      sql: "SELECT item_id, quantity FROM invoice_items WHERE invoice_id = ?",
      args: [invoiceId],
    });

    if (itemsResult.rows.length === 0) {
      return NextResponse.json({ error: "الفاتورة لا تحتوي على بنود" }, { status: 400 });
    }

    const invNum = String(inv.invoice_number ?? "");
    const digitalFee = Number(inv.digital_service_fee ?? 0);

    for (const row of itemsResult.rows) {
      const itemId = row.item_id as string;
      const qty = Number(row.quantity ?? 0);

      if (invType === "purchase") {
        const stockResult = await db.execute({
          sql: "SELECT quantity FROM item_warehouse_stock WHERE item_id = ? AND warehouse_id = ?",
          args: [itemId, warehouseId],
        });
        const available = stockResult.rows[0] ? Number(stockResult.rows[0].quantity ?? 0) : 0;
        if (available < qty) {
          return NextResponse.json(
            { error: `الكمية المتاحة للصنف غير كافية للمرتجع (متاح: ${available})` },
            { status: 400 }
          );
        }
      }

      const smId = randomUUID();

      if (invType === "purchase") {
        await db.execute({
          sql: `INSERT INTO stock_movements (id, item_id, warehouse_id, quantity, movement_type, reference_type, reference_id, performed_by)
                VALUES (?, ?, ?, ?, 'return', 'invoice_return', ?, ?)`,
          args: [smId, itemId, warehouseId, -qty, invoiceId, session.user.id],
        });
        await db.execute({
          sql: "UPDATE item_warehouse_stock SET quantity = quantity - ?, updated_at = datetime('now') WHERE item_id = ? AND warehouse_id = ?",
          args: [qty, itemId, warehouseId],
        });
      } else {
        await db.execute({
          sql: `INSERT INTO stock_movements (id, item_id, warehouse_id, quantity, movement_type, reference_type, reference_id, performed_by)
                VALUES (?, ?, ?, ?, 'return', 'invoice_return', ?, ?)`,
          args: [smId, itemId, warehouseId, qty, invoiceId, session.user.id],
        });

        const stockExisting = await db.execute({
          sql: "SELECT id FROM item_warehouse_stock WHERE item_id = ? AND warehouse_id = ?",
          args: [itemId, warehouseId],
        });
        if (stockExisting.rows.length > 0) {
          await db.execute({
            sql: "UPDATE item_warehouse_stock SET quantity = quantity + ?, updated_at = datetime('now') WHERE item_id = ? AND warehouse_id = ?",
            args: [qty, itemId, warehouseId],
          });
        } else {
          await db.execute({
            sql: "INSERT INTO item_warehouse_stock (id, item_id, warehouse_id, quantity) VALUES (?, ?, ?, ?)",
            args: [randomUUID(), itemId, warehouseId, qty],
          });
        }
      }
    }

    if (digitalFee > 0 && invType !== "purchase") {
      const walletResult = await db.execute({
        sql: "SELECT id FROM company_wallets WHERE company_id = ?",
        args: [SYSTEM_COMPANY_ID],
      });
      if (walletResult.rows.length > 0) {
        await db.execute({
          sql: "UPDATE company_wallets SET balance = balance + ? WHERE company_id = ?",
          args: [digitalFee, SYSTEM_COMPANY_ID],
        });
        await db.execute({
          sql: `INSERT INTO wallet_transactions (id, wallet_id, amount, type, description, reference_type, reference_id, performed_by)
                VALUES (?, ?, ?, 'credit', ?, 'invoice_return', ?, ?)`,
          args: [randomUUID(), walletResult.rows[0].id, digitalFee, `إرجاع خدمة رقمية - فاتورة ${invNum}`, invoiceId, session.user.id],
        });
      }
    }

    await db.execute({
      sql: "UPDATE invoices SET status = 'returned', updated_at = datetime('now') WHERE id = ? AND company_id = ?",
      args: [invoiceId, SYSTEM_COMPANY_ID],
    });

    return NextResponse.json({ success: true, message: "تم تحويل الفاتورة إلى مرتجع" });
  } catch (error) {
    console.error("Invoice return error:", error);
    return NextResponse.json({ error: "فشل في تنفيذ المرتجع" }, { status: 500 });
  }
}

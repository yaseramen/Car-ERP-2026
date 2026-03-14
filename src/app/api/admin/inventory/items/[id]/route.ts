import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";

const SYSTEM_COMPANY_ID = "company-system";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const itemResult = await db.execute({
      sql: `SELECT i.*, 
            COALESCE((SELECT SUM(quantity) FROM item_warehouse_stock WHERE item_id = i.id), 0) as total_quantity
            FROM items i 
            WHERE i.id = ? AND i.company_id = ?`,
      args: [id, SYSTEM_COMPANY_ID],
    });

    if (itemResult.rows.length === 0) {
      return NextResponse.json({ error: "الصنف غير موجود" }, { status: 404 });
    }

    const item = itemResult.rows[0];

    const movementsResult = await db.execute({
      sql: `SELECT sm.*, w.name as warehouse_name 
            FROM stock_movements sm 
            LEFT JOIN warehouses w ON sm.warehouse_id = w.id 
            WHERE sm.item_id = ? 
            ORDER BY sm.created_at DESC 
            LIMIT 100`,
      args: [id],
    });

    const stockResult = await db.execute({
      sql: `SELECT iws.*, w.name as warehouse_name 
            FROM item_warehouse_stock iws 
            JOIN warehouses w ON iws.warehouse_id = w.id 
            WHERE iws.item_id = ?`,
      args: [id],
    });

    const invoiceItemsResult = await db.execute({
      sql: `SELECT ii.*, inv.invoice_number, inv.type as invoice_type, inv.created_at
            FROM invoice_items ii 
            JOIN invoices inv ON ii.invoice_id = inv.id 
            WHERE ii.item_id = ? 
            ORDER BY inv.created_at DESC 
            LIMIT 50`,
      args: [id],
    });

    return NextResponse.json({
      item: {
        id: item.id,
        name: item.name,
        code: item.code,
        barcode: item.barcode,
        category: item.category,
        unit: item.unit,
        purchase_price: item.purchase_price,
        sale_price: item.sale_price,
        min_quantity: item.min_quantity,
        total_quantity: item.total_quantity,
        created_at: item.created_at,
        updated_at: item.updated_at,
      },
      stock_by_warehouse: stockResult.rows.map((r) => ({
        warehouse_name: r.warehouse_name,
        quantity: r.quantity,
        reserved: r.reserved_quantity,
      })),
      movements: movementsResult.rows.map((m) => ({
        id: m.id,
        quantity: m.quantity,
        type: m.movement_type,
        warehouse_name: m.warehouse_name,
        reference_type: m.reference_type,
        reference_id: m.reference_id,
        notes: m.notes,
        created_at: m.created_at,
      })),
      invoice_history: invoiceItemsResult.rows.map((ii) => ({
        invoice_number: ii.invoice_number,
        invoice_type: ii.invoice_type,
        quantity: ii.quantity,
        unit_price: ii.unit_price,
        total: ii.total,
        created_at: ii.created_at,
      })),
    });
  } catch (error) {
    console.error("Item detail error:", error);
    return NextResponse.json({ error: "فشل في جلب البيانات" }, { status: 500 });
  }
}

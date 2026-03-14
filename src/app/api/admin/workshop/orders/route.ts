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

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const result = await db.execute({
      sql: `SELECT ro.*, c.name as customer_name, inv.invoice_number,
            (SELECT COUNT(*) FROM repair_order_items WHERE repair_order_id = ro.id) as items_count,
            (SELECT SUM(total) FROM repair_order_items WHERE repair_order_id = ro.id) as items_total
            FROM repair_orders ro
            LEFT JOIN customers c ON ro.customer_id = c.id
            LEFT JOIN invoices inv ON ro.invoice_id = inv.id
            WHERE ro.company_id = ?
            ORDER BY 
              CASE ro.stage 
                WHEN 'received' THEN 1 
                WHEN 'inspection' THEN 2 
                WHEN 'maintenance' THEN 3 
                WHEN 'ready' THEN 4 
                WHEN 'completed' THEN 5 
                ELSE 6 
              END,
              ro.created_at DESC`,
      args: [SYSTEM_COMPANY_ID],
    });

    const orders = result.rows.map((row) => ({
      id: row.id,
      order_number: row.order_number,
      customer_id: row.customer_id,
      customer_name: row.customer_name,
      vehicle_plate: row.vehicle_plate,
      vehicle_model: row.vehicle_model,
      vehicle_year: row.vehicle_year,
      stage: row.stage,
      inspection_notes: row.inspection_notes,
      received_at: row.received_at,
      completed_at: row.completed_at,
      created_at: row.created_at,
      items_count: row.items_count ?? 0,
      items_total: row.items_total ?? 0,
      invoice_number: row.invoice_number ?? null,
    }));

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Orders GET error:", error);
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
    const { vehicle_plate, vehicle_model, vehicle_year, mileage, customer_id } = body;

    if (!vehicle_plate?.trim()) {
      return NextResponse.json({ error: "رقم اللوحة مطلوب" }, { status: 400 });
    }

    const warehouseId = await ensureWarehouse();

    const countResult = await db.execute({
      sql: "SELECT COUNT(*) as cnt FROM repair_orders WHERE company_id = ?",
      args: [SYSTEM_COMPANY_ID],
    });
    const count = (countResult.rows[0]?.cnt as number) ?? 0;
    const orderNumber = `RO-${String(count + 1).padStart(4, "0")}`;
    const id = randomUUID();

    await db.execute({
      sql: `INSERT INTO repair_orders (id, company_id, order_number, customer_id, vehicle_plate, vehicle_model, vehicle_year, mileage, stage, warehouse_id, received_at, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, datetime('now'), ?)`,
      args: [
        id,
        SYSTEM_COMPANY_ID,
        orderNumber,
        customer_id || null,
        vehicle_plate.trim(),
        vehicle_model?.trim() || null,
        vehicle_year ? Number(vehicle_year) : null,
        mileage ? Number(mileage) : null,
        warehouseId,
        session.user.id,
      ],
    });

    const newOrder = await db.execute({
      sql: "SELECT * FROM repair_orders WHERE id = ?",
      args: [id],
    });

    const row = newOrder.rows[0];
    return NextResponse.json({
      id: row.id,
      order_number: row.order_number,
      vehicle_plate: row.vehicle_plate,
      vehicle_model: row.vehicle_model,
      vehicle_year: row.vehicle_year,
      stage: row.stage,
      received_at: row.received_at,
      created_at: row.created_at,
    });
  } catch (error) {
    console.error("Order POST error:", error);
    return NextResponse.json({ error: "فشل في إنشاء الأمر" }, { status: 500 });
  }
}

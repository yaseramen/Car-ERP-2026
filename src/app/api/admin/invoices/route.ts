import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { getCompanyId } from "@/lib/company";

const ALLOWED_ROLES = ["super_admin", "tenant_owner", "employee"] as const;

export async function GET() {
  const session = await auth();
  const companyId = getCompanyId(session);
  if (!session?.user || !companyId || !ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const result = await db.execute({
      sql: `SELECT inv.*, c.name as customer_name, ro.order_number, ro.vehicle_plate
            FROM invoices inv
            LEFT JOIN customers c ON inv.customer_id = c.id
            LEFT JOIN repair_orders ro ON inv.repair_order_id = ro.id
            WHERE inv.company_id = ?
            ORDER BY inv.created_at DESC
            LIMIT 200`,
      args: [companyId],
    });

    const invoices = result.rows.map((row) => ({
      id: row.id,
      invoice_number: row.invoice_number,
      type: row.type,
      status: row.status,
      subtotal: Number(row.subtotal ?? 0),
      digital_service_fee: Number(row.digital_service_fee ?? 0),
      total: Number(row.total ?? 0),
      paid_amount: Number(row.paid_amount ?? 0),
      customer_name: row.customer_name ? String(row.customer_name) : null,
      order_number: row.order_number ? String(row.order_number) : null,
      vehicle_plate: row.vehicle_plate ? String(row.vehicle_plate) : null,
      repair_order_id: row.repair_order_id ? String(row.repair_order_id) : null,
      created_at: row.created_at,
    }));

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Invoices GET error:", error);
    return NextResponse.json({ error: "فشل في جلب البيانات" }, { status: 500 });
  }
}

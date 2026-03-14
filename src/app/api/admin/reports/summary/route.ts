import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";

const SYSTEM_COMPANY_ID = "company-system";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 19).replace("T", " ");
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 19).replace("T", " ");
}

function startOfMonth(d: Date) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 19).replace("T", " ");
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    const salesToday = await db.execute({
      sql: `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
            FROM invoices WHERE company_id = ? AND type IN ('sale', 'maintenance')
            AND status NOT IN ('cancelled', 'returned') AND created_at >= ?`,
      args: [SYSTEM_COMPANY_ID, todayStart],
    });

    const salesWeek = await db.execute({
      sql: `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
            FROM invoices WHERE company_id = ? AND type IN ('sale', 'maintenance')
            AND status NOT IN ('cancelled', 'returned') AND created_at >= ?`,
      args: [SYSTEM_COMPANY_ID, weekStart],
    });

    const salesMonth = await db.execute({
      sql: `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
            FROM invoices WHERE company_id = ? AND type IN ('sale', 'maintenance')
            AND status NOT IN ('cancelled', 'returned') AND created_at >= ?`,
      args: [SYSTEM_COMPANY_ID, monthStart],
    });

    const workshopStats = await db.execute({
      sql: `SELECT stage, COUNT(*) as cnt FROM repair_orders WHERE company_id = ?
            GROUP BY stage`,
      args: [SYSTEM_COMPANY_ID],
    });

    const lowStock = await db.execute({
      sql: `SELECT COUNT(*) as cnt FROM items i
            WHERE i.company_id = ? AND i.is_active = 1 AND i.min_quantity > 0
            AND COALESCE((SELECT SUM(quantity) FROM item_warehouse_stock WHERE item_id = i.id), 0) < i.min_quantity`,
      args: [SYSTEM_COMPANY_ID],
    });

    const pendingInvoices = await db.execute({
      sql: `SELECT COUNT(*) as cnt, COALESCE(SUM(total - paid_amount), 0) as remaining
            FROM invoices WHERE company_id = ? AND status IN ('pending', 'partial')
            AND type IN ('sale', 'maintenance')`,
      args: [SYSTEM_COMPANY_ID],
    });

    const workshopByStage: Record<string, number> = {};
    for (const row of workshopStats.rows) {
      workshopByStage[String(row.stage ?? "")] = Number(row.cnt ?? 0);
    }

    return NextResponse.json({
      sales: {
        today: { total: Number(salesToday.rows[0]?.total ?? 0), count: Number(salesToday.rows[0]?.count ?? 0) },
        week: { total: Number(salesWeek.rows[0]?.total ?? 0), count: Number(salesWeek.rows[0]?.count ?? 0) },
        month: { total: Number(salesMonth.rows[0]?.total ?? 0), count: Number(salesMonth.rows[0]?.count ?? 0) },
      },
      workshop: workshopByStage,
      lowStockCount: Number(lowStock.rows[0]?.cnt ?? 0),
      pendingInvoices: {
        count: Number(pendingInvoices.rows[0]?.cnt ?? 0),
        remaining: Number(pendingInvoices.rows[0]?.remaining ?? 0),
      },
    });
  } catch (error) {
    console.error("Reports summary error:", error);
    return NextResponse.json({ error: "فشل في جلب البيانات" }, { status: 500 });
  }
}

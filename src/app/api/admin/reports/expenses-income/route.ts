import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { getCompanyId } from "@/lib/company";

const ALLOWED_ROLES = ["super_admin", "tenant_owner", "employee"] as const;

export async function GET(request: Request) {
  const session = await auth();
  const companyId = getCompanyId(session);
  if (!session?.user || !companyId || !ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  try {
    const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const toDate = to || new Date().toISOString().slice(0, 10);
    const fromStr = `${fromDate}T00:00:00`;
    const toStr = `${toDate}T23:59:59`;

    const result = await db.execute({
      sql: `SELECT tt.*, t.name as treasury_name, t.type as treasury_type, pm.name as method_name
            FROM treasury_transactions tt
            JOIN treasuries t ON tt.treasury_id = t.id
            LEFT JOIN payment_methods pm ON tt.payment_method_id = pm.id
            WHERE t.company_id = ? AND tt.reference_type IN ('expense', 'income')
            AND tt.created_at >= ? AND tt.created_at <= ?
            ORDER BY tt.created_at DESC`,
      args: [companyId, fromStr, toStr],
    });

    const rows = result.rows.map((r) => ({
      id: r.id,
      amount: Number(r.amount ?? 0),
      type: r.reference_type,
      description: r.description,
      treasury_name: r.treasury_name,
      treasury_type: r.treasury_type,
      method_name: r.method_name,
      created_at: r.created_at,
    }));

    const totalExpenses = rows.filter((r) => r.type === "expense").reduce((s, r) => s + Math.abs(r.amount), 0);
    const totalIncome = rows.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);

    return NextResponse.json({
      rows,
      totalExpenses,
      totalIncome,
      net: totalIncome - totalExpenses,
      from: fromDate,
      to: toDate,
    });
  } catch (error) {
    console.error("Expenses/income report error:", error);
    return NextResponse.json({ error: "فشل في جلب البيانات" }, { status: 500 });
  }
}

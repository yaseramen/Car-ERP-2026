import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const result = await db.execute({
      sql: "SELECT id, name, type FROM payment_methods WHERE (company_id IS NULL OR company_id = '') AND (is_active = 1 OR is_active IS NULL) ORDER BY name",
      args: [],
    });

    const methods = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
    }));

    return NextResponse.json(methods);
  } catch (error) {
    console.error("Payment methods GET error:", error);
    return NextResponse.json({ error: "فشل في جلب البيانات" }, { status: 500 });
  }
}

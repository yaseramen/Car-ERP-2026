import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCompanyId } from "@/lib/company";
import { canAccess } from "@/lib/permissions";
import { resolveAcSpecs } from "@/lib/ac-specs-resolve";

const ALLOWED_ROLES = ["super_admin", "tenant_owner", "employee"] as const;

export async function POST(request: Request) {
  const session = await auth();
  const companyId = getCompanyId(session);
  if (!session?.user || !companyId || !ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  if (session.user.role === "employee") {
    const ok = await canAccess(session.user.id, "employee", companyId, "workshop", "read");
    if (!ok) return NextResponse.json({ error: "لا تملك صلاحية الورشة" }, { status: 403 });
  }

  let body: { make?: string; model?: string; year?: number | string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const make = typeof body.make === "string" ? body.make.trim() : "";
  const model = typeof body.model === "string" ? body.model.trim() : "";
  if (!make || !model) {
    return NextResponse.json({ error: "أدخل الماركة والموديل" }, { status: 400 });
  }

  let year: number | null = null;
  if (body.year != null && body.year !== "") {
    const y = typeof body.year === "number" ? body.year : Number(String(body.year).trim());
    if (Number.isFinite(y)) year = Math.trunc(y);
  }

  try {
    const { row, error } = await resolveAcSpecs(make, model, year);
    if (!row) {
      return NextResponse.json({ error: error ?? "لا توجد بيانات" }, { status: 404 });
    }
    return NextResponse.json({
      source: row.source,
      spec: {
        id: row.id,
        make: row.make,
        model: row.model,
        year_from: row.year_from,
        year_to: row.year_to,
        refrigerant_type: row.refrigerant_type,
        refrigerant_weight: row.refrigerant_weight,
        oil_type: row.oil_type,
        oil_amount: row.oil_amount,
        last_updated: row.last_updated,
      },
    });
  } catch (e) {
    console.error("[ac-specs lookup]", e);
    return NextResponse.json({ error: "تعذّر تنفيذ الاستعلام" }, { status: 500 });
  }
}

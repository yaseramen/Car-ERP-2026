import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCompanyId, isPlatformOwnerCompany } from "@/lib/company";
import { canAccess } from "@/lib/permissions";
import { findAcSpecLocal, normalizeKey, resolveAcSpecsAiPathOnly } from "@/lib/ac-specs-resolve";
import {
  AC_SPECS_LOOKUP_COST_EGP,
  chargeAcSpecsLookup,
  refundAcSpecsLookup,
} from "@/lib/ac-specs-wallet";

const ALLOWED_ROLES = ["super_admin", "tenant_owner", "employee"] as const;

function errorChainText(err: unknown): string {
  const parts: string[] = [];
  let cur: unknown = err;
  let depth = 0;
  while (cur != null && depth < 6) {
    if (cur instanceof Error) {
      parts.push(cur.message);
      const proto = cur as Error & { proto?: { message?: string } };
      if (proto.proto?.message) parts.push(String(proto.proto.message));
      cur = cur.cause;
    } else {
      parts.push(String(cur));
      break;
    }
    depth++;
  }
  return parts.join(" ");
}

function isMissingAcSpecsTable(err: unknown): boolean {
  return /no such table:\s*ac_specs/i.test(errorChainText(err));
}

/** بيانات للعرض فقط — بدون معرف داخلي ولا ربط بملف شخصي */
function specForClient(row: {
  make: string;
  model: string;
  year_from: number;
  year_to: number | null;
  refrigerant_type: string;
  refrigerant_weight: number | null;
  oil_type: string | null;
  oil_amount: number | null;
  last_updated: string;
}) {
  return {
    make: row.make,
    model: row.model,
    year_from: row.year_from,
    year_to: row.year_to,
    refrigerant_type: row.refrigerant_type,
    refrigerant_weight: row.refrigerant_weight,
    oil_type: row.oil_type,
    oil_amount: row.oil_amount,
    last_updated: row.last_updated,
  };
}

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

  const makeKey = normalizeKey(make);
  const modelKey = normalizeKey(model);
  const skipWallet = isPlatformOwnerCompany(companyId);

  let walletId: string | null = null;
  let chargeTxId: string | null = null;

  try {
    const local = await findAcSpecLocal(makeKey, modelKey, year);
    if (local) {
      return NextResponse.json({
        source: "local" as const,
        charged: false,
        cost_egp: 0,
        spec: specForClient(local),
      });
    }

    if (!skipWallet) {
      const charge = await chargeAcSpecsLookup(companyId, session.user.id);
      if (!charge.ok) {
        return NextResponse.json({ error: "رصيدك غير كافٍ" }, { status: 402 });
      }
      walletId = charge.data.walletId;
      chargeTxId = charge.data.transactionId;
    }

    const { row, error } = await resolveAcSpecsAiPathOnly(make, model, year);

    if (!row) {
      if (walletId && chargeTxId) {
        try {
          await refundAcSpecsLookup(walletId, chargeTxId, session.user.id);
        } catch (re) {
          console.error("[ac-specs lookup] refund failed", re);
        }
      }
      return NextResponse.json({ error: error ?? "لا توجد بيانات" }, { status: 404 });
    }

    return NextResponse.json({
      source: row.source,
      charged: !skipWallet,
      cost_egp: skipWallet ? 0 : AC_SPECS_LOOKUP_COST_EGP,
      spec: specForClient(row),
    });
  } catch (e) {
    if (walletId && chargeTxId) {
      try {
        await refundAcSpecsLookup(walletId, chargeTxId, session.user.id);
      } catch (re) {
        console.error("[ac-specs lookup] refund after error failed", re);
      }
    }
    console.error("[ac-specs lookup]", e);
    if (isMissingAcSpecsTable(e)) {
      return NextResponse.json(
        {
          error:
            "قاعدة البيانات لم تُحدَّث بعد: جدول مواصفات التكييف غير موجود. من جهاز يملك صلاحية Turso نفّذ: npm run db:migrate (بنفس متغيرات TURSO للإنتاج)، أو نفّذ ملف الترحيل 041_ac_specs.sql من لوحة Turso → SQL.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "تعذّر تنفيذ الاستعلام" }, { status: 500 });
  }
}

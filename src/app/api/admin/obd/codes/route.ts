import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { randomUUID } from "crypto";

const SYSTEM_COMPANY_ID = "company-system";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "50", 10) || 50);
  let sql = "SELECT id, code, description_ar, description_en, source, search_count, vehicle_brand_id, vehicle_model_id, year_from, year_to, created_at FROM obd_codes WHERE 1=1";
  const args: (string | number)[] = [];
  if (q) {
    sql += " AND (UPPER(code) LIKE ? OR description_ar LIKE ? OR description_en LIKE ?)";
    const like = `%${q}%`;
    args.push(like, like, like);
  }
  sql += " ORDER BY code LIMIT ?";
  args.push(limit);
  const r = await db.execute({ sql, args });
  return NextResponse.json(
    r.rows.map((row) => ({
      id: row.id,
      code: row.code,
      description_ar: row.description_ar,
      description_en: row.description_en,
      source: row.source,
      search_count: row.search_count,
      vehicle_brand_id: row.vehicle_brand_id,
      vehicle_model_id: row.vehicle_model_id,
      year_from: row.year_from,
      year_to: row.year_to,
      created_at: row.created_at,
    }))
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  const body = await request.json();
  const code = body.code?.trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "الكود مطلوب" }, { status: 400 });
  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO obd_codes (id, company_id, code, description_ar, description_en, causes, solutions, symptoms, source, vehicle_brand_id, vehicle_model_id, year_from, year_to)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'local', ?, ?, ?, ?)`,
    args: [
      id,
      SYSTEM_COMPANY_ID,
      code,
      body.description_ar?.trim() || null,
      body.description_en?.trim() || null,
      body.causes?.trim() || null,
      body.solutions?.trim() || null,
      body.symptoms?.trim() || null,
      body.vehicle_brand_id || null,
      body.vehicle_model_id || null,
      body.year_from ?? null,
      body.year_to ?? null,
    ],
  });
  return NextResponse.json({ id, code });
}

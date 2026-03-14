import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { randomUUID } from "crypto";
import {
  OBD_SEARCH_COST,
  resolveCode,
  extractCodesFromFile,
  type ObdResult,
} from "@/lib/obd";
import { ensureVehicleBrand, ensureVehicleModel } from "@/lib/obd-vehicles";

const SYSTEM_COMPANY_ID = "company-system";
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "يرجى رفع ملف (صورة أو PDF)" }, { status: 400 });
    }

    const mimeType = file.type;
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: "نوع الملف غير مدعوم. استخدم: JPG, PNG, WebP أو PDF" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "حجم الملف يتجاوز 4 ميجابايت" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const companyCheck = await db.execute({
      sql: "SELECT id FROM companies WHERE id = ?",
      args: [SYSTEM_COMPANY_ID],
    });
    if (companyCheck.rows.length === 0) {
      await db.execute({
        sql: "INSERT INTO companies (id, name, is_active) VALUES (?, 'نظام الأمين', 1)",
        args: [SYSTEM_COMPANY_ID],
      });
    }

    let walletResult = await db.execute({
      sql: "SELECT id, balance FROM company_wallets WHERE company_id = ?",
      args: [SYSTEM_COMPANY_ID],
    });

    if (walletResult.rows.length === 0) {
      await db.execute({
        sql: "INSERT INTO company_wallets (id, company_id, balance, currency) VALUES (?, ?, 0, 'EGP')",
        args: [randomUUID(), SYSTEM_COMPANY_ID],
      });
      walletResult = await db.execute({
        sql: "SELECT id, balance FROM company_wallets WHERE company_id = ?",
        args: [SYSTEM_COMPANY_ID],
      });
    }

    const { codes, vehicle, reason, errorDetail } = await extractCodesFromFile(base64, mimeType);
    if (codes.length === 0) {
      let msg =
        reason === "no_api_key"
          ? "GEMINI_API_KEY أو GROQ_API_KEY غير مفعّل. أضفه في Vercel → Settings → Environment Variables ثم أعد النشر."
          : reason === "api_error"
            ? "فشل في الاتصال بالذكاء الاصطناعي."
            : "لم يتم العثور على أكواد OBD في الملف. تأكد أن التقرير يحتوي على أكواد مثل P0100 أو P0171.";
      if (errorDetail) msg += ` (${errorDetail})`;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const uniqueCodes = [...new Set(codes)];
    const totalCost = uniqueCodes.length * OBD_SEARCH_COST;
    const balance = Number(walletResult.rows[0]?.balance ?? 0);

    if (walletResult.rows.length === 0 || balance < totalCost) {
      return NextResponse.json(
        {
          error: `رصيد المحفظة غير كافٍ. المطلوب: ${totalCost} ج.م (${uniqueCodes.length} كود × ${OBD_SEARCH_COST} ج.م)`,
        },
        { status: 400 }
      );
    }

    const results: (ObdResult & { cost: number })[] = [];
    const walletId = walletResult.rows[0].id;

    for (const code of uniqueCodes) {
      const { result, obdCodeId } = await resolveCode(code);
      results.push({ ...result, cost: OBD_SEARCH_COST });

      const wtId = randomUUID();
      await db.execute({
        sql: "UPDATE company_wallets SET balance = balance - ? WHERE company_id = ?",
        args: [OBD_SEARCH_COST, SYSTEM_COMPANY_ID],
      });
      await db.execute({
        sql: `INSERT INTO wallet_transactions (id, wallet_id, amount, type, description, reference_type, reference_id, performed_by)
              VALUES (?, ?, ?, 'obd_search', ?, 'obd_search', ?, ?)`,
        args: [wtId, walletId, OBD_SEARCH_COST, `تحليل OBD - كود ${code}`, wtId, session.user.id],
      });
      await db.execute({
        sql: `INSERT INTO obd_searches (id, company_id, code, obd_code_id, wallet_transaction_id, result_summary, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          randomUUID(),
          SYSTEM_COMPANY_ID,
          code,
          obdCodeId,
          wtId,
          result.description_ar ?? "",
          session.user.id,
        ],
      });
    }

    let vehicleBrandId: string | null = null;
    let vehicleModelId: string | null = null;
    try {
      if (vehicle?.brand) {
        vehicleBrandId = await ensureVehicleBrand(vehicle.brand);
        if (vehicleBrandId && vehicle?.model) {
          vehicleModelId = await ensureVehicleModel(vehicleBrandId, vehicle.model);
        }
      }
    } catch (e) {
      console.warn("Auto-expand vehicle tables:", e);
    }

    try {
      await db.execute({
        sql: `INSERT INTO obd_reports (id, company_id, file_name, vehicle_brand, vehicle_model, vehicle_year, vehicle_vin, vehicle_brand_id, vehicle_model_id, codes_extracted, codes_count, total_cost, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          randomUUID(),
          SYSTEM_COMPANY_ID,
          file.name,
          vehicle?.brand || null,
          vehicle?.model || null,
          vehicle?.year || null,
          vehicle?.vin || null,
          vehicleBrandId,
          vehicleModelId,
          JSON.stringify(uniqueCodes),
          uniqueCodes.length,
          totalCost,
          session.user.id,
        ],
      });
    } catch (e) {
      try {
        await db.execute({
          sql: `INSERT INTO obd_reports (id, company_id, file_name, vehicle_brand, vehicle_model, vehicle_year, vehicle_vin, codes_extracted, codes_count, total_cost, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            randomUUID(),
            SYSTEM_COMPANY_ID,
            file.name,
            vehicle?.brand || null,
            vehicle?.model || null,
            vehicle?.year || null,
            vehicle?.vin || null,
            JSON.stringify(uniqueCodes),
            uniqueCodes.length,
            totalCost,
            session.user.id,
          ],
        });
      } catch (e2) {
        console.warn("obd_reports insert failed:", e2);
      }
    }

    return NextResponse.json({
      results,
      totalCost,
      codesFound: uniqueCodes.length,
      vehicle: vehicle || undefined,
    });
  } catch (error) {
    console.error("OBD analyze error:", error);
    const msg = error instanceof Error ? error.message : "فشل في تحليل الملف";
    return NextResponse.json({ error: `فشل في تحليل الملف: ${msg}` }, { status: 500 });
  }
}

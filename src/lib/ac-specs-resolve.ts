import { db } from "@/lib/db/client";
import { randomUUID } from "crypto";
import { fetchAcSpecsWithAi } from "@/lib/ac-specs-ai";

export type AcSpecsRow = {
  id: string;
  make: string;
  model: string;
  year_from: number;
  year_to: number | null;
  refrigerant_type: string;
  refrigerant_weight: number | null;
  oil_type: string | null;
  oil_amount: number | null;
  last_updated: string;
  source: "local" | "ai";
};

function normalizeKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function yearInRange(y: number, from: number, to: number | null): boolean {
  if (y < from) return false;
  if (to == null) return true;
  return y <= to;
}

/** أقرب صف لمطابقة الماركة/الموديل والسنة ضمن النطاق */
export async function findAcSpecLocal(
  makeKey: string,
  modelKey: string,
  year: number | null
): Promise<AcSpecsRow | null> {
  const res = await db.execute({
    sql: `SELECT id, make, model, year_from, year_to, refrigerant_type, refrigerant_weight, oil_type, oil_amount, last_updated
          FROM ac_specs
          WHERE make_key = ? AND model_key = ?
          ORDER BY year_from DESC`,
    args: [makeKey, modelKey],
  });
  const rows = res.rows;
  if (rows.length === 0) return null;

  if (year != null && Number.isFinite(year)) {
    const y = Math.trunc(year);
    for (const row of rows) {
      const from = Number(row.year_from ?? 0);
      const toRaw = row.year_to;
      const to = toRaw != null && toRaw !== "" ? Number(toRaw) : null;
      if (Number.isFinite(from) && yearInRange(y, from, Number.isFinite(to as number) ? (to as number) : null)) {
        return mapRow(row, "local");
      }
    }
  }

  const row = rows[0];
  if (!row) return null;
  return mapRow(row, "local");
}

function mapRow(row: Record<string, unknown>, source: "local" | "ai"): AcSpecsRow {
  const yto = row.year_to;
  return {
    id: String(row.id ?? ""),
    make: String(row.make ?? ""),
    model: String(row.model ?? ""),
    year_from: Number(row.year_from ?? 0),
    year_to: yto != null && yto !== "" && Number.isFinite(Number(yto)) ? Number(yto) : null,
    refrigerant_type: String(row.refrigerant_type ?? ""),
    refrigerant_weight:
      row.refrigerant_weight != null && row.refrigerant_weight !== ""
        ? Number(row.refrigerant_weight)
        : null,
    oil_type: row.oil_type != null && String(row.oil_type).trim() ? String(row.oil_type) : null,
    oil_amount: row.oil_amount != null && row.oil_amount !== "" ? Number(row.oil_amount) : null,
    last_updated: String(row.last_updated ?? ""),
    source,
  };
}

async function insertAcSpec(row: {
  make: string;
  model: string;
  make_key: string;
  model_key: string;
  year_from: number;
  year_to: number | null;
  refrigerant_type: string;
  refrigerant_weight: number | null;
  oil_type: string | null;
  oil_amount: number | null;
}): Promise<AcSpecsRow> {
  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO ac_specs (id, make, model, make_key, model_key, year_from, year_to, refrigerant_type, refrigerant_weight, oil_type, oil_amount, last_updated)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    args: [
      id,
      row.make,
      row.model,
      row.make_key,
      row.model_key,
      row.year_from,
      row.year_to,
      row.refrigerant_type,
      row.refrigerant_weight,
      row.oil_type,
      row.oil_amount,
    ],
  });
  const again = await db.execute({
    sql: `SELECT id, make, model, year_from, year_to, refrigerant_type, refrigerant_weight, oil_type, oil_amount, last_updated
          FROM ac_specs WHERE id = ?`,
    args: [id],
  });
  const r = again.rows[0];
  if (!r) {
    return {
      id,
      make: row.make,
      model: row.model,
      year_from: row.year_from,
      year_to: row.year_to,
      refrigerant_type: row.refrigerant_type,
      refrigerant_weight: row.refrigerant_weight,
      oil_type: row.oil_type,
      oil_amount: row.oil_amount,
      last_updated: new Date().toISOString(),
      source: "ai",
    };
  }
  return mapRow(r as Record<string, unknown>, "ai");
}

/** مسار الذكاء الاصطناعي + الإدراج في ac_specs فقط (بدون بحث محلي مسبق) — للاستدعاء بعد التحقق من المحفظة */
export async function resolveAcSpecsAiPathOnly(
  makeRaw: string,
  modelRaw: string,
  year: number | null
): Promise<{ row: AcSpecsRow | null; error?: string }> {
  const make = makeRaw.trim() || "غير محدد";
  const model = modelRaw.trim() || "غير محدد";

  const ai = await fetchAcSpecsWithAi(make, model, year);
  if (!ai) {
    return {
      row: null,
      error:
        "تعذّر جلب بيانات التكييف تلقائياً. تأكد من ضبط GEMINI_API_KEY أو GROQ_API_KEY أو OPENAI_API_KEY في إعدادات الخادم.",
    };
  }

  const aiMakeKey = normalizeKey(ai.make);
  const aiModelKey = normalizeKey(ai.model);

  try {
    const inserted = await insertAcSpec({
      make: ai.make,
      model: ai.model,
      make_key: aiMakeKey,
      model_key: aiModelKey,
      year_from: ai.year_from,
      year_to: ai.year_to,
      refrigerant_type: ai.refrigerant_type,
      refrigerant_weight: ai.refrigerant_weight,
      oil_type: ai.oil_type,
      oil_amount: ai.oil_amount,
    });
    return { row: inserted };
  } catch {
    const retry = await findAcSpecLocal(aiMakeKey, aiModelKey, year);
    if (retry) return { row: { ...retry, source: "local" } };
    return { row: null, error: "تعذّر حفظ بيانات التكييف في القاعدة." };
  }
}

/**
 * يبحث محلياً ثم يستدعي الذكاء الاصطناعي عند غياب السجل، ويُدرج قبل الإرجاع.
 * ملاحظة: الرسوم والتحقق من المحفظة يُنفَّذان في مسار الـ API قبل استدعاء مسار الذكاء الاصطناعي عند الحاجة.
 */
export async function resolveAcSpecs(
  makeRaw: string,
  modelRaw: string,
  year: number | null
): Promise<{ row: AcSpecsRow | null; error?: string }> {
  const make = makeRaw.trim() || "غير محدد";
  const model = modelRaw.trim() || "غير محدد";
  const make_key = normalizeKey(make);
  const model_key = normalizeKey(model);

  const local = await findAcSpecLocal(make_key, model_key, year);
  if (local) return { row: local };

  return resolveAcSpecsAiPathOnly(makeRaw, modelRaw, year);
}

export { normalizeKey };

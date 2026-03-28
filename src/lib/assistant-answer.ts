/**
 * مساعد داخلي بدون APIs خارجية — إجابات من قاعدة البيانات فقط، مع احترام الصلاحيات.
 */

import { db } from "@/lib/db/client";
import type { DistributionContext } from "@/lib/distribution";

export type AssistantMode = "company" | "obd_global";

export { ASSISTANT_COMPANY_COST_EGP, ASSISTANT_OBD_GLOBAL_COST_EGP } from "@/lib/assistant-pricing";

type PermCheck = (module: string) => Promise<boolean>;

function normalizeCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** يستخرج أول كود يشبه P0xxx من النص */
export function extractObdCodeFromMessage(message: string): string | null {
  const m = message.toUpperCase().match(/\b(P|C|B|U)[0-9A-Z]{3,5}\b/);
  return m ? normalizeCode(m[0]) : null;
}

function stripDiacritics(s: string): string {
  return s.replace(/[\u064B-\u065F\u0670]/g, "");
}

/** أول 15 صنفاً نشطاً — للقوائم العامة */
export async function answerInventoryListTop(
  companyId: string,
  dist: DistributionContext | null
): Promise<string> {
  const qtyExpr = dist
    ? `(SELECT COALESCE(quantity, 0) FROM item_warehouse_stock WHERE item_id = items.id AND warehouse_id = ?)`
    : `COALESCE((SELECT SUM(quantity) FROM item_warehouse_stock WHERE item_id = items.id), 0)`;

  let sql = `SELECT items.name, ${qtyExpr} as qty, items.sale_price
            FROM items WHERE items.company_id = ? AND items.is_active = 1`;
  const args: (string | number)[] = [];
  if (dist) args.push(dist.assignedWarehouseId);
  args.push(companyId);
  sql += ` ORDER BY items.name ASC LIMIT 15`;

  const res = await db.execute({ sql, args });
  if (res.rows.length === 0) return "لا توجد أصناف مسجّلة.";
  const whNote = dist ? ` — مخزن: ${dist.warehouseName}` : "";
  const lines = res.rows.map((row) => {
    const name = String(row.name ?? "");
    const qty = Number(row.qty ?? 0);
    const price = Number(row.sale_price ?? 0);
    return `• ${name}: ${qty} — ${price.toFixed(2)} ج.م`;
  });
  return `أول الأصناف (حتى 15)${whNote}:\n${lines.join("\n")}`;
}

/** ملخص مخزون / أصناف — حسب صلاحية المخزن ومخزن التوزيع */
export async function answerInventoryQuery(
  companyId: string,
  message: string,
  dist: DistributionContext | null
): Promise<string | null> {
  const m = stripDiacritics(message).toLowerCase();

  const wantsSearch =
    /صنف|قطعه|قطعة|باركود|كود|منتج|مخزون|كميه|كمية|رصيد|يوجد|عندي|available|stock/i.test(m) ||
    m.split(/\s+/).length >= 2;

  if (!wantsSearch) return null;

  // استخراج كلمة بحث: أطول كلمة عربية/إنجليزية بعد تجاهل كلمات شائعة
  const stop = new Set(["ما", "هل", "كم", "عند", "في", "من", "على", "هذا", "هذه", "اريد", "أريد", "بحث", "عن", "ظهر", "لي"]);
  const words = message
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !stop.has(w.toLowerCase()));

  const searchTerm = words.find((w) => w.length >= 2) ?? "";

  const qtyExpr = dist
    ? `(SELECT COALESCE(quantity, 0) FROM item_warehouse_stock WHERE item_id = items.id AND warehouse_id = ?)`
    : `COALESCE((SELECT SUM(quantity) FROM item_warehouse_stock WHERE item_id = items.id), 0)`;

  let sql = `SELECT items.id, items.name, items.code, items.barcode, items.category,
            ${qtyExpr} as qty,
            items.min_quantity, items.sale_price
            FROM items
            WHERE items.company_id = ? AND items.is_active = 1`;
  const args: (string | number)[] = [];
  if (dist) args.push(dist.assignedWarehouseId);
  args.push(companyId);

  if (searchTerm.length >= 2) {
    sql += ` AND (
      LOWER(items.name) LIKE ? OR LOWER(COALESCE(items.code,'')) LIKE ?
      OR LOWER(COALESCE(items.barcode,'')) LIKE ? OR LOWER(COALESCE(items.category,'')) LIKE ?
    )`;
    const q = `%${searchTerm.toLowerCase()}%`;
    args.push(q, q, q, q);
  }

  sql += ` ORDER BY items.name ASC LIMIT 15`;

  const res = await db.execute({ sql, args });
  if (res.rows.length === 0) {
    return searchTerm
      ? `لا توجد أصناف مطابقة لـ «${searchTerm}»${dist ? ` في مخزن «${dist.warehouseName}»` : ""}.`
      : "لم يُعثر على أصناف مطابقة. جرّب كتابة اسم أو باركود أو جزء من اسم الصنف.";
  }

  const lines = res.rows.map((row) => {
    const name = String(row.name ?? "");
    const qty = Number(row.qty ?? 0);
    const minQ = Number(row.min_quantity ?? 0);
    const price = Number(row.sale_price ?? 0);
    const low = minQ > 0 && qty < minQ ? " ⚠️ تحت الحد الأدنى" : "";
    const whNote = dist ? ` [${dist.warehouseName}]` : "";
    return `• ${name}${whNote}: الكمية ${qty}${low} — سعر البيع ${price.toFixed(2)} ج.م`;
  });

  return `نتائج المخزون:\n${lines.join("\n")}`;
}

export async function answerInvoiceSnippet(companyId: string): Promise<string> {
  const res = await db.execute({
    sql: `SELECT invoice_number, type, status, total, datetime(created_at) as created_at
          FROM invoices WHERE company_id = ? ORDER BY created_at DESC LIMIT 5`,
    args: [companyId],
  });
  if (res.rows.length === 0) return "لا توجد فواتير مسجّلة بعد.";
  const lines = res.rows.map((r) => {
    const num = String(r.invoice_number ?? "");
    const typ = String(r.type ?? "");
    const st = String(r.status ?? "");
    const tot = Number(r.total ?? 0);
    const dt = String(r.created_at ?? "");
    return `• ${num} (${typ}) — ${st} — ${tot.toFixed(2)} ج.م — ${dt}`;
  });
  return `آخر الفواتير:\n${lines.join("\n")}`;
}

export async function answerCompanyAssistant(
  companyId: string,
  message: string,
  dist: DistributionContext | null,
  can: PermCheck
): Promise<{ reply: string }> {
  const m = stripDiacritics(message).toLowerCase();

  const invKeywords = /مخزون|صنف|صنف|قطعه|قطعة|باركود|منتج|كميه|كمية|رصيد|stock|قطع/i.test(m);
  const invListKeywords = /قائمه|قائمة|كل الاصناف|كل الأصناف|عرض الاصناف|عرض الأصناف/i.test(m);
  const invSummaryKeywords = /ملخص|احصائيه|إحصائية|كم صنف|عدد الاصناف|عدد الأصناف/i.test(m);

  const invoiceKeywords = /فاتوره|فاتورة|بيع|شراء|صيانه|صيانة|invoice/i.test(m);

  if (invKeywords || invListKeywords || invSummaryKeywords) {
    if (!(await can("inventory"))) {
      return { reply: "لا تملك صلاحية عرض المخزون. اطلب من المسؤول منح صلاحية «المخزن» (عرض)." };
    }
    if (invSummaryKeywords && !invKeywords && !invListKeywords) {
      const countRes = await db.execute({
        sql: "SELECT COUNT(*) as c FROM items WHERE company_id = ? AND is_active = 1",
        args: [companyId],
      });
      const n = Number(countRes.rows[0]?.c ?? 0);
      return { reply: `عدد الأصناف النشطة في الشركة: ${n}. للبحث عن صنف معيّن اكتب اسمه أو الباركود.` };
    }
    if (invListKeywords && !invKeywords) {
      const list = await answerInventoryListTop(companyId, dist);
      return { reply: list };
    }
    const inv = await answerInventoryQuery(companyId, message, dist);
    if (inv) return { reply: inv };
  }

  if (invoiceKeywords) {
    if (!(await can("invoices"))) {
      return { reply: "لا تملك صلاحية عرض الفواتير." };
    }
    const snippet = await answerInvoiceSnippet(companyId);
    return { reply: snippet };
  }

  return {
    reply:
      "يمكنني مساعدتك ضمن بيانات شركتك فقط. جرّب مثلاً: «كمية صنف …» أو «فاتورة» لعرض آخر الفواتير، أو اسأل عن مخزون باسم أو باركود.\n\nإذا أردت شرح كود عطل OBD من قاعدة البرنامج العامة، اختر وضع «أكواد السيارات» (تكلفة 1 ج.م لكل استعلام).",
  };
}

export async function answerObdGlobalFromDb(code: string): Promise<{ reply: string; found: boolean }> {
  const normalized = normalizeCode(code);
  const res = await db.execute({
    sql: `SELECT code, description_ar, description_en, causes, solutions, symptoms
          FROM obd_codes WHERE company_id IS NULL AND UPPER(TRIM(code)) = ? LIMIT 1`,
    args: [normalized],
  });
  if (res.rows.length === 0) {
    return {
      found: false,
      reply: `لا يوجد سجل لكود «${normalized}» في قاعدة الأكواد العامة داخل البرنامج. يمكنك استخدام صفحة OBD للبحث الموسّع (قد يتضمن توليداً بالذكاء الاصطناعي برسوم أخرى).`,
    };
  }
  const row = res.rows[0];
  const desc = String(row.description_ar ?? row.description_en ?? "—");
  const causes = String(row.causes ?? "").replace(/\|/g, " • ");
  const sol = String(row.solutions ?? "").replace(/\|/g, " • ");
  const sym = String(row.symptoms ?? "").replace(/\|/g, " • ");
  let text = `الكود: ${normalized}\nالوصف: ${desc}`;
  if (causes) text += `\nأسباب محتملة: ${causes}`;
  if (sol) text += `\nحلول عملية: ${sol}`;
  if (sym) text += `\nأعراض شائعة: ${sym}`;
  text += "\n\n(من قاعدة بيانات البرنامج العامة — ليس توليداً خارجياً)";
  return { reply: text, found: true };
}

"use client";

import { useState, type FormEvent } from "react";

type AcSpecResponse = {
  source: "local" | "ai";
  charged: boolean;
  cost_egp: number;
  spec: {
    make: string;
    model: string;
    year_from: number;
    year_to: number | null;
    refrigerant_type: string;
    refrigerant_weight: number | null;
    oil_type: string | null;
    oil_amount: number | null;
    last_updated: string;
  };
};

export function WorkshopAcSpecsLookup() {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AcSpecResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const m = make.trim();
    const mo = model.trim();
    if (!m || !mo) {
      setError("أدخل الماركة والموديل.");
      return;
    }
    setLoading(true);
    try {
      const y = year.trim();
      const res = await fetch("/api/admin/workshop/ac-specs/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          make: m,
          model: mo,
          year: y ? Number(y) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "فشل الاستعلام");
        return;
      }
      setResult(data as AcSpecResponse);
    } catch {
      setError("حدث خطأ في الشبكة");
    } finally {
      setLoading(false);
    }
  }

  const ref = result?.spec.refrigerant_type?.toUpperCase().replace(/\s/g, "");
  const isR1234yf = ref === "R1234YF";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-1">استعلام مواصفات التكييف (A/C)</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        إن وُجدت بيانات في الذاكرة المشتركة للمنصة تُعرض مجاناً. عند الحاجة لاستدعاء الذكاء الاصطناعي يُخصم{" "}
        <strong>1 ج.م</strong> من رصيد محفظة شركتك تحت مسمى «رسوم استعلام فني - تكييف». النتيجة للعرض فقط ولا تُربط
        بملف عميل أو أمر إصلاح.
      </p>
      <form onSubmit={handleLookup} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">الماركة</label>
          <input
            type="text"
            value={make}
            onChange={(e) => setMake(e.target.value)}
            placeholder="مثال: Toyota"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            dir="auto"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">الموديل</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="مثال: Corolla"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            dir="auto"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">سنة الصنع (اختياري)</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="مثال: 2018"
            min={1980}
            max={2035}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400 text-white text-sm font-medium rounded-lg transition"
          >
            {loading ? "جاري البحث…" : "استعلام"}
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
          {isR1234yf && (
            <div className="px-4 py-2.5 bg-amber-100 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100 text-sm">
              تنبيه: نوع الفريون <strong>R1234yf</strong> — عادة أعلى تكلفة من R134a؛ راجع التسعير والكمية مع العميل.
            </div>
          )}
          <div className="p-4 bg-gray-50/80 dark:bg-gray-900/40">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                {result.source === "local" ? "من الذاكرة المشتركة (بدون رسوم)" : "عبر الذكاء الاصطناعي"}
              </span>
              {result.charged && (
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/40 text-cyan-900 dark:text-cyan-100">
                  تم خصم {result.cost_egp} ج.م
                </span>
              )}
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 dark:text-gray-400">الماركة</dt>
                <dd className="text-gray-900 dark:text-gray-100 font-medium text-left">{result.spec.make}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 dark:text-gray-400">الموديل</dt>
                <dd className="text-gray-900 dark:text-gray-100 font-medium text-left">{result.spec.model}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 dark:text-gray-400">سنوات التطبيق</dt>
                <dd className="text-gray-900 dark:text-gray-100">
                  {result.spec.year_from}
                  {result.spec.year_to != null ? ` — ${result.spec.year_to}` : " — مستمر / غير محدد"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 dark:text-gray-400">نوع الفريون</dt>
                <dd className="text-gray-900 dark:text-gray-100 font-medium">{result.spec.refrigerant_type}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 dark:text-gray-400">كمية الفريون</dt>
                <dd className="text-gray-900 dark:text-gray-100">
                  {result.spec.refrigerant_weight != null ? `${result.spec.refrigerant_weight} g` : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 dark:text-gray-400">نوع زيت التكييف</dt>
                <dd className="text-gray-900 dark:text-gray-100">{result.spec.oil_type ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500 dark:text-gray-400">كمية الزيت</dt>
                <dd className="text-gray-900 dark:text-gray-100">
                  {result.spec.oil_amount != null ? `${result.spec.oil_amount} ml` : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2 sm:col-span-2">
                <dt className="text-gray-500 dark:text-gray-400">آخر تحديث للمرجع</dt>
                <dd className="text-gray-700 dark:text-gray-300 text-xs">{result.spec.last_updated}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              البيانات إرشادية؛ يُفضّل التحقق من دليل الصانع أو الشاسيه عند الشك.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

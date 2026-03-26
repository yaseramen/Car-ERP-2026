"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { InventoryCategoryFilter } from "@/components/inventory/inventory-category-filter";

type ItemRow = {
  id: string;
  name: string;
  code: string | null;
  category: string | null;
  unit: string;
  sale_price: number;
  quantity: number;
};

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm";

export function PriceListContent({ companyName }: { companyName: string | null }) {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("");
  const [inStockOnly, setInStockOnly] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("عرض أسعار");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "500");
      params.set("offset", "0");
      if (debounced) params.set("search", debounced);
      if (category) params.set("category", category);
      if (inStockOnly) params.set("in_stock", "1");
      const res = await fetch(`/api/admin/inventory/items?${params.toString()}`);
      const d = res.ok ? await res.json() : { items: [] };
      const list = Array.isArray(d) ? d : (d.items ?? []);
      setItems(list);
      setSelectedIds((prev) => {
        const next = new Set<string>();
        for (const it of list as ItemRow[]) {
          if (prev.has(it.id)) next.add(it.id);
        }
        return next;
      });
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [debounced, category, inStockOnly]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id));

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const rowsForPrint = useMemo(() => {
    const chosen = items.filter((i) => selectedIds.has(i.id));
    return chosen.length > 0 ? chosen : items;
  }, [items, selectedIds]);

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) {
      alert("اسمح بالنوافذ المنبثقة للطباعة");
      return;
    }
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const subtitle =
      selectedIds.size > 0
        ? `${selectedIds.size} صنف مختار`
        : inStockOnly
          ? "جميع الأصناف المتاحة في المخزون (حسب الفلاتر)"
          : "جميع الأصناف (حسب الفلاتر)";
    const rowsHtml = rowsForPrint
      .map(
        (r) => `
      <tr>
        <td>${esc(r.name)}</td>
        <td>${esc(r.code || "—")}</td>
        <td>${esc(r.category || "—")}</td>
        <td>${esc(r.unit || "قطعة")}</td>
        <td class="num">${r.quantity.toFixed(r.quantity % 1 === 0 ? 0 : 2)}</td>
        <td class="num">${r.sale_price.toFixed(2)} ج.م</td>
      </tr>`
      )
      .join("");
    const cn = companyName ? esc(companyName) : "عرض أسعار";
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>${esc(title)}</title>
      <style>
        @page { margin: 12mm; }
        body { font-family: Arial, Tahoma, sans-serif; font-size: 11px; color: #111; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .sub { color: #555; margin-bottom: 16px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: right; }
        th { background: #f3f4f6; font-weight: 600; }
        .num { direction: ltr; text-align: left; unicode-bidi: isolate; }
        .foot { margin-top: 14px; font-size: 10px; color: #666; }
      </style></head><body>
      <h1>${esc(title)}</h1>
      <div class="sub">${cn} — ${esc(subtitle)}</div>
      <table><thead><tr>
        <th>الصنف</th><th>الكود</th><th>القسم</th><th>الوحدة</th><th>الكمية</th><th>سعر البيع</th>
      </tr></thead><tbody>${rowsHtml}</tbody></table>
      <p class="foot">الأسعار وفق سعر البيع المسجّل في المخزن. صالح لتاريخ الطباعة.</p>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.close();
    }, 300);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-500 mb-1">بحث</label>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="اسم، كود، باركود، قسم..."
            className={inputClass}
          />
        </div>
        <InventoryCategoryFilter
          id="price-list-category"
          loadOnMount
          value={category}
          onChange={setCategory}
          className="w-44"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          المتاح فقط (كمية &gt; 0)
        </label>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`${inputClass} max-w-xs`}
          placeholder="عنوان المستند"
        />
        <button
          type="button"
          onClick={toggleAll}
          className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {allSelected ? "إلغاء تحديد الكل" : "تحديد الكل المعروض"}
        </button>
        <button
          type="button"
          onClick={handlePrint}
          disabled={loading || rowsForPrint.length === 0}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
        >
          طباعة / PDF
        </button>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        اختر أصنافاً محددة بالمربعات، أو اترك بدون تحديد لطباعة <strong>كل ما يظهر في القائمة</strong> حسب البحث والفلتر.
        زر «طباعة» يفتح نافذة الطباعة — يمكنك حفظها كـ PDF من المتصفح.
      </p>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-gray-500">جاري التحميل...</p>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-gray-500">لا توجد أصناف تطابق الفلتر.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <th className="w-10 px-2 py-3"></th>
                  <th className="text-right px-4 py-3">الصنف</th>
                  <th className="text-right px-4 py-3">الكود</th>
                  <th className="text-right px-4 py-3">القسم</th>
                  <th className="text-right px-4 py-3">الكمية</th>
                  <th className="text-right px-4 py-3">سعر البيع</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b border-gray-50 dark:border-gray-700/80">
                    <td className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(it.id)}
                        onChange={() => toggleOne(it.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{it.name}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400 font-mono text-xs">{it.code || "—"}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{it.category || "—"}</td>
                    <td className="px-4 py-2">{it.quantity}</td>
                    <td className="px-4 py-2 font-medium">{it.sale_price.toFixed(2)} ج.م</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

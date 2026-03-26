"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { InventoryCategoryFilter } from "@/components/inventory/inventory-category-filter";
import { SearchableSelect } from "@/components/ui/searchable-select";

type Party = { id: string; name: string; phone?: string | null };

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

type RecipientMode = "none" | "customer" | "supplier" | "company";

export function PriceListContent({ companyName }: { companyName: string | null }) {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("");
  const [inStockOnly, setInStockOnly] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("عرض أسعار");

  const [customers, setCustomers] = useState<Party[]>([]);
  const [suppliers, setSuppliers] = useState<Party[]>([]);
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("none");
  const [customerId, setCustomerId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [externalCompanyName, setExternalCompanyName] = useState("");
  const [externalCompanyPhone, setExternalCompanyPhone] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/customers?limit=500&offset=0").then((r) => (r.ok ? r.json() : { customers: [] })),
      fetch("/api/admin/suppliers?limit=500&offset=0").then((r) => (r.ok ? r.json() : { suppliers: [] })),
    ])
      .then(([c, s]) => {
        setCustomers(Array.isArray(c) ? c : (c.customers ?? []));
        setSuppliers(Array.isArray(s) ? s : (s.suppliers ?? []));
      })
      .catch(() => {});
  }, []);

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

  const recipientBlockHtml = useMemo(() => {
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const fromLine = companyName
      ? `<p class="hdr-line"><span class="lbl">من:</span> ${esc(companyName)}</p>`
      : `<p class="hdr-line"><span class="lbl">من:</span> شركة / منشأة</p>`;

    if (recipientMode === "none") {
      return `${fromLine}<p class="hdr-note">— يمكن تحديد الجهة الموجّه إليها من القائمة أعلاه لظهورها بصيغة رسمية —</p>`;
    }
    if (recipientMode === "customer" && customerId) {
      const c = customers.find((x) => x.id === customerId);
      const name = c?.name ?? "";
      const phone = c?.phone ? ` — هاتف: ${c.phone}` : "";
      return `${fromLine}<p class="hdr-line to"><span class="lbl">إلى السادة /</span> ${esc(name + phone)}</p><p class="hdr-sub">عملاء — عرض أسعار</p>`;
    }
    if (recipientMode === "supplier" && supplierId) {
      const s = suppliers.find((x) => x.id === supplierId);
      const name = s?.name ?? "";
      const phone = s?.phone ? ` — هاتف: ${s.phone}` : "";
      return `${fromLine}<p class="hdr-line to"><span class="lbl">إلى السادة /</span> ${esc(name + phone)}</p><p class="hdr-sub">موردون — عرض أسعار</p>`;
    }
    if (recipientMode === "company" && externalCompanyName.trim()) {
      const ph = externalCompanyPhone.trim() ? ` — هاتف: ${externalCompanyPhone.trim()}` : "";
      return `${fromLine}<p class="hdr-line to"><span class="lbl">إلى السادة / شركة</span> ${esc(externalCompanyName.trim() + ph)}</p><p class="hdr-sub">جهة خارجية — عرض أسعار</p>`;
    }
    return `${fromLine}<p class="hdr-note">أكمل بيانات الجهة الموجّه إليها</p>`;
  }, [
    companyName,
    recipientMode,
    customerId,
    supplierId,
    customers,
    suppliers,
    externalCompanyName,
    externalCompanyPhone,
  ]);

  const handlePrint = () => {
    if (recipientMode === "customer" && !customerId) {
      alert("اختر عميلاً أو غيّر «الجهة الموجّه إليها».");
      return;
    }
    if (recipientMode === "supplier" && !supplierId) {
      alert("اختر مورداً أو غيّر «الجهة الموجّه إليها».");
      return;
    }
    if (recipientMode === "company" && !externalCompanyName.trim()) {
      alert("أدخل اسم الشركة / الجهة الخارجية أو اختر نوعاً آخر.");
      return;
    }
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
        h1 { font-size: 18px; margin: 0 0 8px; }
        .letterhead { border: 1px solid #ddd; padding: 10px 12px; margin-bottom: 14px; background: #fafafa; }
        .hdr-line { margin: 4px 0; font-size: 12px; }
        .hdr-line.to { font-weight: 600; }
        .lbl { color: #444; font-weight: 600; margin-left: 6px; }
        .hdr-sub { margin: 6px 0 0; font-size: 10px; color: #666; }
        .hdr-note { font-size: 10px; color: #888; margin: 4px 0 0; }
        .sub { color: #555; margin-bottom: 16px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: right; }
        th { background: #f3f4f6; font-weight: 600; }
        .num { direction: ltr; text-align: left; unicode-bidi: isolate; }
        .foot { margin-top: 14px; font-size: 10px; color: #666; }
      </style></head><body>
      <h1>${esc(title)}</h1>
      <div class="letterhead">${recipientBlockHtml}</div>
      <div class="sub">${cn} — ${esc(subtitle)}</div>
      <table><thead><tr>
        <th>الصنف</th><th>الكود</th><th>القسم</th><th>الوحدة</th><th>الكمية</th><th>سعر البيع</th>
      </tr></thead><tbody>${rowsHtml}</tbody></table>
      <p class="foot">مستند عرض أسعار صادر من المنشأة أعلاه. الأسعار وفق سعر البيع المسجّل في المخزن ولا تُعد فاتورة بيع حتى الاتفاق والتأكيد. صالح لتاريخ الطباعة.</p>
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

      <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">توجيه رسمي (اختياري)</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[160px]">
            <label className="block text-xs text-gray-500 mb-1">الجهة الموجّه إليها</label>
            <select
              value={recipientMode}
              onChange={(e) => {
                const v = e.target.value as RecipientMode;
                setRecipientMode(v);
                setCustomerId("");
                setSupplierId("");
                if (v !== "company") {
                  setExternalCompanyName("");
                  setExternalCompanyPhone("");
                }
              }}
              className={inputClass}
            >
              <option value="none">عام (بدون توجيه)</option>
              <option value="customer">عميل من القائمة</option>
              <option value="supplier">مورد من القائمة</option>
              <option value="company">شركة / جهة خارجية (اسم يدوي)</option>
            </select>
          </div>
          {recipientMode === "customer" && (
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs text-gray-500 mb-1">اختر العميل</label>
              <SearchableSelect
                options={customers.map((c) => ({
                  id: c.id,
                  label: c.name,
                  searchText: c.phone ? String(c.phone) : undefined,
                }))}
                value={customerId}
                onChange={(id) => setCustomerId(id)}
                placeholder="ابحث بالاسم أو الهاتف..."
                className={inputClass}
              />
            </div>
          )}
          {recipientMode === "supplier" && (
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs text-gray-500 mb-1">اختر المورد</label>
              <SearchableSelect
                options={suppliers.map((s) => ({
                  id: s.id,
                  label: s.name,
                  searchText: s.phone ? String(s.phone) : undefined,
                }))}
                value={supplierId}
                onChange={(id) => setSupplierId(id)}
                placeholder="ابحث بالاسم أو الهاتف..."
                className={inputClass}
              />
            </div>
          )}
          {recipientMode === "company" && (
            <>
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs text-gray-500 mb-1">اسم الشركة / الجهة *</label>
                <input
                  type="text"
                  value={externalCompanyName}
                  onChange={(e) => setExternalCompanyName(e.target.value)}
                  className={inputClass}
                  placeholder="مثال: شركة…"
                />
              </div>
              <div className="w-40">
                <label className="block text-xs text-gray-500 mb-1">هاتف (اختياري)</label>
                <input
                  type="text"
                  value={externalCompanyPhone}
                  onChange={(e) => setExternalCompanyPhone(e.target.value)}
                  className={inputClass}
                  placeholder="01..."
                />
              </div>
            </>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          يظهر في أعلى الطباعة: <strong>من</strong> اسم شركتك، و<strong>إلى</strong> الجهة التي تختارها — مناسب لمراسلات B2B.
        </p>
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

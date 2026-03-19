"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { exportToExcel, exportToPdf } from "@/lib/export-reports";

const STAGE_LABELS: Record<string, string> = {
  received: "استلام",
  inspection: "فحص",
  maintenance: "صيانة",
  ready: "جاهزة",
  completed: "مكتمل",
};

const MOVEMENT_LABELS: Record<string, string> = {
  in: "إدخال",
  out: "إخراج",
  transfer: "نقل",
  adjustment: "تعديل",
  workshop_install: "تركيب ورشة",
  return: "مرتجع",
};

type Tab = "summary" | "sales" | "profit" | "inventory" | "workshop" | "expenses" | "suppliers";

export function ReportsContent() {
  const [tab, setTab] = useState<Tab>("summary");
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [sales, setSales] = useState<Record<string, unknown> | null>(null);
  const [profit, setProfit] = useState<Record<string, unknown> | null>(null);
  const [inventory, setInventory] = useState<Record<string, unknown> | null>(null);
  const [workshop, setWorkshop] = useState<Record<string, unknown> | null>(null);
  const [expensesIncome, setExpensesIncome] = useState<Record<string, unknown> | null>(null);
  const [suppliersReport, setSuppliersReport] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState("");

  function setDateRange(days: number) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setDateFrom(from.toISOString().slice(0, 10));
    setDateTo(to.toISOString().slice(0, 10));
  }

  function filterBySearch<T>(items: T[], getSearchText: (item: T) => string): T[] {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => getSearchText(item).toLowerCase().includes(q));
  }

  async function fetchSummary() {
    try {
      const res = await fetch("/api/admin/reports/summary");
      if (res.ok) setSummary(await res.json());
    } catch {}
  }

  async function fetchSales() {
    try {
      const res = await fetch(`/api/admin/reports/sales?from=${dateFrom}&to=${dateTo}`);
      if (res.ok) setSales(await res.json());
    } catch {}
  }

  async function fetchProfit() {
    try {
      const res = await fetch(`/api/admin/reports/profit?from=${dateFrom}&to=${dateTo}`);
      if (res.ok) setProfit(await res.json());
    } catch {}
  }

  async function fetchInventory() {
    try {
      const res = await fetch(`/api/admin/reports/inventory?from=${dateFrom}&to=${dateTo}`);
      if (res.ok) setInventory(await res.json());
    } catch {}
  }

  async function fetchWorkshop() {
    try {
      const res = await fetch(`/api/admin/reports/workshop?from=${dateFrom}&to=${dateTo}`);
      if (res.ok) setWorkshop(await res.json());
    } catch {}
  }

  async function fetchExpensesIncome() {
    try {
      const res = await fetch(`/api/admin/reports/expenses-income?from=${dateFrom}&to=${dateTo}`);
      if (res.ok) setExpensesIncome(await res.json());
    } catch {}
  }

  async function fetchSuppliersReport() {
    try {
      const res = await fetch(`/api/admin/reports/suppliers?from=${dateFrom}&to=${dateTo}`);
      if (res.ok) setSuppliersReport(await res.json());
    } catch {}
  }

  useEffect(() => {
    setLoading(true);
    fetchSummary().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "sales") fetchSales();
    else if (tab === "profit") fetchProfit();
    else if (tab === "inventory") fetchInventory();
    else if (tab === "workshop") fetchWorkshop();
    else if (tab === "expenses") fetchExpensesIncome();
    else if (tab === "suppliers") fetchSuppliersReport();
  }, [tab, dateFrom, dateTo]);

  const tabs = [
    { id: "summary" as Tab, label: "ملخص" },
    { id: "sales" as Tab, label: "المبيعات" },
    { id: "profit" as Tab, label: "الأرباح" },
    { id: "inventory" as Tab, label: "المخزون" },
    { id: "workshop" as Tab, label: "الورشة" },
    { id: "expenses" as Tab, label: "المصروفات والإيرادات" },
    { id: "suppliers" as Tab, label: "مقارنة الموردين" },
  ];

  function handleExportExcel() {
    if (tab === "sales" && sales?.invoices) {
      const data = (sales.invoices as Array<{ created_at: string; invoice_number: string; type: string; customer_name: string | null; vehicle_plate: string | null; total: number }>).map((inv) => ({
        التاريخ: new Date(inv.created_at).toLocaleDateString("ar-EG"),
        "رقم الفاتورة": inv.invoice_number,
        النوع: inv.type === "maintenance" ? "صيانة" : "بيع",
        "العميل/اللوحة": inv.customer_name || inv.vehicle_plate || "—",
        الإجمالي: inv.total,
      }));
      exportToExcel(data, `مبيعات-${dateFrom}-${dateTo}`, "المبيعات");
    } else if (tab === "profit" && profit?.rows) {
      const data = (profit.rows as Array<{ created_at: string; invoice_number: string; type: string; item_name: string; quantity: number; sale_price: number; item_total: number; cost_total: number; profit: number }>).map((r) => ({
        التاريخ: new Date(r.created_at).toLocaleDateString("ar-EG"),
        "رقم الفاتورة": r.invoice_number,
        النوع: r.type === "maintenance" ? "صيانة" : "بيع",
        الصنف: r.item_name,
        الكمية: r.quantity,
        "سعر البيع": r.sale_price,
        "إجمالي البيع": r.item_total,
        "إجمالي التكلفة": r.cost_total,
        الربح: r.profit,
      }));
      exportToExcel(data, `أرباح-${dateFrom}-${dateTo}`, "الأرباح");
    } else if (tab === "inventory" && (inventory?.movements || inventory?.valuation)) {
      if (inventory?.valuation && (inventory.valuation as unknown[]).length > 0) {
        const data = (inventory.valuation as Array<{ name: string; quantity: number; purchase_price: number; value: number }>).map((v) => ({
          الصنف: v.name,
          الكمية: v.quantity,
          "سعر الشراء": v.purchase_price,
          القيمة: v.value,
        }));
        exportToExcel(data, `قيمة-مخزون-${dateFrom}-${dateTo}`, "قيمة المخزون");
      } else if (inventory?.movements) {
        const data = (inventory.movements as Array<{ item_name: string; quantity: number; movement_type: string; created_at: string }>).map((m) => ({
          التاريخ: new Date(m.created_at).toLocaleString("ar-EG"),
          الصنف: m.item_name,
          الكمية: m.quantity,
          النوع: MOVEMENT_LABELS[m.movement_type] || m.movement_type,
        }));
        exportToExcel(data, `حركة-مخزون-${dateFrom}-${dateTo}`, "حركة المخزون");
      }
    } else if (tab === "workshop" && workshop?.completed) {
      const data = (workshop.completed as Array<{ completed_at: string; order_number: string; vehicle_plate: string; total: number }>).map((o) => ({
        التاريخ: new Date(o.completed_at).toLocaleDateString("ar-EG"),
        "رقم الأمر": o.order_number,
        اللوحة: o.vehicle_plate,
        الإجمالي: o.total,
      }));
      exportToExcel(data, `ورشة-${dateFrom}-${dateTo}`, "الورشة");
    } else if (tab === "expenses" && expensesIncome?.rows) {
      const data = (expensesIncome.rows as Array<{ type: string; amount: number; description: string; treasury_name: string; created_at: string }>).map((r) => ({
        التاريخ: new Date(r.created_at).toLocaleString("ar-EG"),
        النوع: r.type === "expense" ? "مصروف" : "إيراد",
        المبلغ: r.amount,
        البيان: r.description || "—",
        الخزينة: r.treasury_name,
      }));
      exportToExcel(data, `مصروفات-إيرادات-${dateFrom}-${dateTo}`, "المصروفات والإيرادات");
    } else if (tab === "suppliers" && suppliersReport?.rows) {
      const data = (suppliersReport.rows as Array<{ supplier_name: string; invoice_count: number; total_quantity: number; total_amount: number; avg_price: number }>).map((r) => ({
        المورد: r.supplier_name,
        "عدد الفواتير": r.invoice_count,
        "إجمالي الكميات": r.total_quantity,
        "إجمالي المبالغ": r.total_amount,
        "متوسط السعر": r.avg_price.toFixed(2),
      }));
      exportToExcel(data, `مقارنة-موردين-${dateFrom}-${dateTo}`, "مقارنة الموردين");
    } else {
      alert("لا توجد بيانات للتصدير");
    }
  }

  async function handleExportPdf() {
    const ids: Record<string, string> = {
      sales: "report-sales",
      profit: "report-profit",
      inventory: "report-inventory",
      workshop: "report-workshop",
      expenses: "report-expenses",
      suppliers: "report-suppliers",
    };
    const id = ids[tab];
    if (!id) {
      alert("التصدير غير متاح لهذا التقرير");
      return;
    }
    try {
      await exportToPdf(id, `تقرير-${tab}-${dateFrom}-${dateTo}`);
    } catch {
      alert("فشل في تصدير PDF");
    }
  }

  const s = summary as {
    sales?: { today?: { total: number; count: number }; week?: { total: number; count: number }; month?: { total: number; count: number } };
    workshop?: Record<string, number>;
    lowStockCount?: number;
    pendingInvoices?: { count: number; remaining: number };
  } | null;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? "bg-emerald-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === "sales" || tab === "profit" || tab === "inventory" || tab === "workshop" || tab === "expenses" || tab === "suppliers") && (
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            {[
              { label: "أسبوع", days: 7 },
              { label: "شهر", days: 30 },
              { label: "3 أشهر", days: 90 },
              { label: "سنة", days: 365 },
            ].map(({ label, days }) => (
              <button
                key={days}
                type="button"
                onClick={() => setDateRange(days)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {label}
              </button>
            ))}
          </div>
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 ml-2">من</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 ml-2">إلى</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
          {(tab === "sales" || tab === "profit" || tab === "inventory" || tab === "workshop" || tab === "expenses" || tab === "suppliers") && (
            <>
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
              >
                تصدير Excel
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium"
              >
                تصدير PDF
              </button>
            </>
          )}
        </div>
      )}

      {tab === "summary" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">جاري التحميل...</div>
          ) : s ? (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">مبيعات اليوم</h3>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {Number(s.sales?.today?.total ?? 0).toFixed(2)} ج.م
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.sales?.today?.count ?? 0} فاتورة</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">مبيعات الأسبوع</h3>
                <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                  {Number(s.sales?.week?.total ?? 0).toFixed(2)} ج.م
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.sales?.week?.count ?? 0} فاتورة</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">مبيعات الشهر</h3>
                <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                  {Number(s.sales?.month?.total ?? 0).toFixed(2)} ج.م
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.sales?.month?.count ?? 0} فاتورة</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">تنبيهات</h3>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{s.lowStockCount ?? 0} صنف تحت الحد الأدنى</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {s.pendingInvoices?.count ?? 0} فاتورة معلقة — {Number(s.pendingInvoices?.remaining ?? 0).toFixed(2)} ج.م
                </p>
              </div>
              <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">الورشة حسب المرحلة</h3>
                <div className="flex flex-wrap gap-3">
                  {s.workshop && Object.entries(s.workshop).map(([stage, cnt]) => (
                    <div key={stage} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-300">{STAGE_LABELS[stage] || stage}</span>
                      <span className="font-bold mr-2">{(cnt as number)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {tab === "sales" && (
        <div id="report-sales" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-bold text-gray-900 dark:text-gray-100">تقرير المبيعات</h2>
            {sales?.totals ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                الإجمالي: {Number((sales.totals as { total?: number })?.total ?? 0).toFixed(2)} ج.م — {(sales.totals as { count?: number })?.count ?? 0} فاتورة
              </p>
            ) : null}
          </div>
          <div className="overflow-x-auto max-h-96">
            {sales?.invoices && (sales.invoices as unknown[]).length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">التاريخ</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">رقم الفاتورة</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">النوع</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">العميل / اللوحة</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {filterBySearch(
                    (sales.invoices as Array<{ id: string; invoice_number: string; type: string; customer_name: string | null; vehicle_plate: string | null; total: number; created_at: string }>),
                    (inv) => `${inv.invoice_number} ${inv.customer_name || ""} ${inv.vehicle_plate || ""} ${inv.type === "maintenance" ? "صيانة" : "بيع"}`
                  ).map((inv) => (
                    <tr key={inv.invoice_number} className="border-b border-gray-50">
                      <td className="px-4 py-3 text-sm">{new Date(inv.created_at).toLocaleDateString("ar-EG")}</td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/invoices/${inv.id}`} className="text-emerald-600 hover:underline">
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm">{inv.type === "maintenance" ? "صيانة" : "بيع"}</td>
                      <td className="px-4 py-3 text-sm">{inv.customer_name || inv.vehicle_plate || "—"}</td>
                      <td className="px-4 py-3 text-sm font-medium">{inv.total?.toFixed(2)} ج.م</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">لا توجد فواتير في الفترة المحددة</div>
            )}
          </div>
        </div>
      )}

      {tab === "profit" && (
        <div id="report-profit" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-bold text-gray-900 dark:text-gray-100">تقرير الأرباح</h2>
            {profit?.summary ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                إجمالي المبيعات: {Number((profit.summary as { totalSales?: number })?.totalSales ?? 0).toFixed(2)} ج.م —
                التكلفة: {Number((profit.summary as { totalCost?: number })?.totalCost ?? 0).toFixed(2)} ج.م —
                الربح: <span className="font-medium text-emerald-600">{Number((profit.summary as { totalProfit?: number })?.totalProfit ?? 0).toFixed(2)} ج.م</span>
              </p>
            ) : null}
          </div>
          <div className="overflow-x-auto max-h-96">
            {profit?.rows && (profit.rows as unknown[]).length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">التاريخ</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الفاتورة</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الصنف</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الكمية</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">سعر البيع</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">التكلفة</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الربح</th>
                  </tr>
                </thead>
                <tbody>
                  {filterBySearch(
                    (profit.rows as Array<{ invoice_number: string; item_name: string; quantity: number; sale_price: number; cost_total: number; profit: number; created_at: string }>),
                    (r) => `${r.invoice_number} ${r.item_name}`
                  ).map((r, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="px-4 py-3 text-sm">{new Date(r.created_at).toLocaleDateString("ar-EG")}</td>
                      <td className="px-4 py-3 text-sm">{r.invoice_number}</td>
                      <td className="px-4 py-3 text-sm">{r.item_name}</td>
                      <td className="px-4 py-3 text-sm">{r.quantity}</td>
                      <td className="px-4 py-3 text-sm">{r.sale_price?.toFixed(2)} ج.م</td>
                      <td className="px-4 py-3 text-sm">{r.cost_total?.toFixed(2)} ج.م</td>
                      <td className={`px-4 py-3 text-sm font-medium ${r.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {r.profit?.toFixed(2)} ج.م
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">لا توجد بيانات في الفترة المحددة</div>
            )}
          </div>
        </div>
      )}

      {tab === "inventory" && (
        <div id="report-inventory" className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">قيمة المخزون الإجمالية</h3>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {Number(inventory?.totalValue ?? 0).toFixed(2)} ج.م
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">(كمية × سعر الشراء لكل صنف)</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-bold text-gray-900 dark:text-gray-100">أصناف تحت الحد الأدنى</h2>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {inventory?.lowStock && (inventory.lowStock as unknown[]).length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {filterBySearch(
                    (inventory.lowStock as Array<{ id: string; name: string; quantity: number; min_quantity: number }>),
                    (item) => item.name
                  ).map((item) => (
                    <li key={item.id} className="p-4 flex justify-between">
                      <Link href={`/admin/inventory/${item.id}`} className="text-emerald-600 hover:underline">
                        {item.name}
                      </Link>
                      <span className="text-amber-600 font-medium">{item.quantity} / {item.min_quantity}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">لا توجد أصناف تحت الحد الأدنى</div>
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-bold text-gray-900 dark:text-gray-100">آخر حركات المخزون</h2>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {inventory?.movements && (inventory.movements as unknown[]).length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {filterBySearch(
                    (inventory.movements as Array<{ id: string; item_name: string; quantity: number; movement_type: string; created_at: string }>),
                    (m) => `${m.item_name} ${MOVEMENT_LABELS[m.movement_type] || m.movement_type}`
                  ).map((m) => (
                    <li key={m.id} className="p-4 flex justify-between text-sm">
                      <span>{m.item_name}</span>
                      <span className={m.quantity < 0 ? "text-red-600" : "text-emerald-600"}>
                        {m.quantity > 0 ? "+" : ""}{m.quantity} — {MOVEMENT_LABELS[m.movement_type] || m.movement_type}
                      </span>
                      <span className="text-gray-500">{new Date(m.created_at).toLocaleString("ar-EG")}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">لا توجد حركات</div>
              )}
            </div>
          </div>
          </div>
          {inventory?.valuation && Array.isArray(inventory.valuation) && (inventory.valuation as unknown[]).length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="font-bold text-gray-900 dark:text-gray-100">تفاصيل قيمة المخزون</h2>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الصنف</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الكمية</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">سعر الشراء</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">القيمة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterBySearch(
                      (inventory.valuation as Array<{ id: string; name: string; quantity: number; purchase_price: number; value: number }>),
                      (v) => v.name
                    ).map((v) => (
                      <tr key={v.id} className="border-b border-gray-50 dark:border-gray-700">
                        <td className="px-4 py-3 text-sm">
                          <Link href={`/admin/inventory/${v.id}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">{v.name}</Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{v.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{v.purchase_price?.toFixed(2)} ج.م</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{v.value?.toFixed(2)} ج.م</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {tab === "workshop" && (
        <div id="report-workshop" className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">المراحل</h2>
            <div className="flex flex-wrap gap-3">
              {workshop?.byStage
                ? Object.entries(workshop.byStage as Record<string, number>).map(([stage, cnt]) => (
                    <div key={stage} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-300">{STAGE_LABELS[stage] || stage}</span>
                      <span className="font-bold mr-2">{cnt}</span>
                    </div>
                  ))
                : null}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-bold text-gray-900 dark:text-gray-100">أوامر مكتملة في الفترة</h2>
              {workshop?.completedTotal != null ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  الإجمالي: {Number(workshop.completedTotal).toFixed(2)} ج.م — {Number(workshop.completedCount ?? 0)} أمر
                </p>
              ) : null}
            </div>
            <div className="overflow-x-auto max-h-96">
              {workshop?.completed && (workshop.completed as unknown[]).length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">التاريخ</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">رقم الأمر</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">اللوحة</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterBySearch(
                      (workshop.completed as Array<{ id: string; order_number: string; vehicle_plate: string; completed_at: string; total: number }>),
                      (o) => `${o.order_number} ${o.vehicle_plate}`
                    ).map((o) => (
                      <tr key={o.id} className="border-b border-gray-50 dark:border-gray-700">
                        <td className="px-4 py-3 text-sm">{new Date(o.completed_at).toLocaleDateString("ar-EG")}</td>
                        <td className="px-4 py-3">
                          <Link href={`/admin/workshop/${o.id}`} className="text-emerald-600 hover:underline">
                            {o.order_number}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm">{o.vehicle_plate}</td>
                        <td className="px-4 py-3 text-sm font-medium">{o.total?.toFixed(2)} ج.م</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-gray-500 dark:text-gray-400">لا توجد أوامر مكتملة في الفترة</div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "expenses" && (
        <div id="report-expenses" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">إجمالي المصروفات</h3>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {Number(expensesIncome?.totalExpenses ?? 0).toFixed(2)} ج.م
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">إجمالي الإيرادات</h3>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {Number(expensesIncome?.totalIncome ?? 0).toFixed(2)} ج.م
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">الصافي</h3>
              <p className={`text-2xl font-bold ${Number(expensesIncome?.net ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {Number(expensesIncome?.net ?? 0).toFixed(2)} ج.م
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-bold text-gray-900 dark:text-gray-100">تفاصيل المصروفات والإيرادات</h2>
            </div>
            <div className="overflow-x-auto max-h-96">
              {expensesIncome?.rows && (expensesIncome.rows as unknown[]).length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">التاريخ</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">النوع</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">المبلغ</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">البيان</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الخزينة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterBySearch(
                      (expensesIncome.rows as Array<{ id: string; type: string; amount: number; description: string; treasury_name: string; created_at: string }>),
                      (r) => `${r.description || ""} ${r.treasury_name || ""} ${r.type === "expense" ? "مصروف" : "إيراد"}`
                    ).map((r) => (
                      <tr key={r.id} className="border-b border-gray-50 dark:border-gray-700">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{new Date(r.created_at).toLocaleString("ar-EG")}</td>
                        <td className="px-4 py-3 text-sm">{r.type === "expense" ? "مصروف" : "إيراد"}</td>
                        <td className={`px-4 py-3 text-sm font-medium ${r.amount < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {r.amount.toFixed(2)} ج.م
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{r.description || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{r.treasury_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-gray-500 dark:text-gray-400">لا توجد مصروفات أو إيرادات في الفترة</div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "suppliers" && (
        <div id="report-suppliers" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-bold text-gray-900 dark:text-gray-100">مقارنة الموردين (فواتير الشراء)</h2>
          </div>
          <div className="overflow-x-auto">
            {suppliersReport?.rows && (suppliersReport.rows as unknown[]).length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">المورد</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">عدد الفواتير</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">إجمالي الكميات</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">إجمالي المبالغ</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">متوسط السعر</th>
                  </tr>
                </thead>
                <tbody>
                  {filterBySearch(
                    (suppliersReport.rows as Array<{ supplier_name: string; invoice_count: number; total_quantity: number; total_amount: number; avg_price: number }>),
                    (r) => r.supplier_name
                  ).map((r) => (
                    <tr key={r.supplier_name} className="border-b border-gray-50 dark:border-gray-700">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{r.supplier_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{r.invoice_count}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{r.total_quantity}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{r.total_amount.toFixed(2)} ج.م</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{r.avg_price.toFixed(2)} ج.م</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">لا توجد بيانات مشتريات في الفترة</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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

type Tab = "summary" | "sales" | "profit" | "inventory" | "workshop";

export function ReportsContent() {
  const [tab, setTab] = useState<Tab>("summary");
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [sales, setSales] = useState<Record<string, unknown> | null>(null);
  const [profit, setProfit] = useState<Record<string, unknown> | null>(null);
  const [inventory, setInventory] = useState<Record<string, unknown> | null>(null);
  const [workshop, setWorkshop] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

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

  useEffect(() => {
    setLoading(true);
    fetchSummary().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "sales") fetchSales();
    else if (tab === "profit") fetchProfit();
    else if (tab === "inventory") fetchInventory();
    else if (tab === "workshop") fetchWorkshop();
  }, [tab, dateFrom, dateTo]);

  const tabs = [
    { id: "summary" as Tab, label: "ملخص" },
    { id: "sales" as Tab, label: "المبيعات" },
    { id: "profit" as Tab, label: "الأرباح" },
    { id: "inventory" as Tab, label: "المخزون" },
    { id: "workshop" as Tab, label: "الورشة" },
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
      const data = (profit.rows as Array<{ created_at: string; invoice_number: string; type: string; item_name: string; quantity: number; sale_price: number; purchase_price: number; item_total: number; cost_total: number; profit: number }>).map((r) => ({
        التاريخ: new Date(r.created_at).toLocaleDateString("ar-EG"),
        "رقم الفاتورة": r.invoice_number,
        النوع: r.type === "maintenance" ? "صيانة" : "بيع",
        الصنف: r.item_name,
        الكمية: r.quantity,
        "سعر البيع": r.sale_price,
        "سعر الشراء": r.purchase_price,
        "إجمالي البيع": r.item_total,
        "إجمالي التكلفة": r.cost_total,
        الربح: r.profit,
      }));
      exportToExcel(data, `أرباح-${dateFrom}-${dateTo}`, "الأرباح");
    } else if (tab === "inventory" && inventory?.movements) {
      const data = (inventory.movements as Array<{ item_name: string; quantity: number; movement_type: string; created_at: string }>).map((m) => ({
        التاريخ: new Date(m.created_at).toLocaleString("ar-EG"),
        الصنف: m.item_name,
        الكمية: m.quantity,
        النوع: MOVEMENT_LABELS[m.movement_type] || m.movement_type,
      }));
      exportToExcel(data, `حركة-مخزون-${dateFrom}-${dateTo}`, "حركة المخزون");
    } else if (tab === "workshop" && workshop?.completed) {
      const data = (workshop.completed as Array<{ completed_at: string; order_number: string; vehicle_plate: string; total: number }>).map((o) => ({
        التاريخ: new Date(o.completed_at).toLocaleDateString("ar-EG"),
        "رقم الأمر": o.order_number,
        اللوحة: o.vehicle_plate,
        الإجمالي: o.total,
      }));
      exportToExcel(data, `ورشة-${dateFrom}-${dateTo}`, "الورشة");
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
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === "sales" || tab === "profit" || tab === "inventory" || tab === "workshop") && (
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="text-sm text-gray-600 ml-2">من</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 ml-2">إلى</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300"
            />
          </div>
          {(tab === "sales" || tab === "profit" || tab === "inventory" || tab === "workshop") && (
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
            <div className="col-span-full text-center py-12 text-gray-500">جاري التحميل...</div>
          ) : s ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-1">مبيعات اليوم</h3>
                <p className="text-2xl font-bold text-emerald-600">
                  {Number(s.sales?.today?.total ?? 0).toFixed(2)} ج.م
                </p>
                <p className="text-xs text-gray-500 mt-1">{s.sales?.today?.count ?? 0} فاتورة</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-1">مبيعات الأسبوع</h3>
                <p className="text-2xl font-bold text-gray-700">
                  {Number(s.sales?.week?.total ?? 0).toFixed(2)} ج.م
                </p>
                <p className="text-xs text-gray-500 mt-1">{s.sales?.week?.count ?? 0} فاتورة</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-1">مبيعات الشهر</h3>
                <p className="text-2xl font-bold text-gray-700">
                  {Number(s.sales?.month?.total ?? 0).toFixed(2)} ج.م
                </p>
                <p className="text-xs text-gray-500 mt-1">{s.sales?.month?.count ?? 0} فاتورة</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-1">تنبيهات</h3>
                <p className="text-lg font-bold text-amber-600">{s.lowStockCount ?? 0} صنف تحت الحد الأدنى</p>
                <p className="text-xs text-gray-500 mt-1">
                  {s.pendingInvoices?.count ?? 0} فاتورة معلقة — {Number(s.pendingInvoices?.remaining ?? 0).toFixed(2)} ج.م
                </p>
              </div>
              <div className="md:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">الورشة حسب المرحلة</h3>
                <div className="flex flex-wrap gap-3">
                  {s.workshop && Object.entries(s.workshop).map(([stage, cnt]) => (
                    <div key={stage} className="px-4 py-2 bg-gray-100 rounded-lg">
                      <span className="text-gray-600">{STAGE_LABELS[stage] || stage}</span>
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
        <div id="report-sales" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">تقرير المبيعات</h2>
            {sales?.totals ? (
              <p className="text-sm text-gray-500 mt-1">
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
                  {(sales.invoices as Array<{ id: string; invoice_number: string; type: string; customer_name: string | null; vehicle_plate: string | null; total: number; created_at: string }>).map((inv) => (
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
              <div className="p-12 text-center text-gray-500">لا توجد فواتير في الفترة المحددة</div>
            )}
          </div>
        </div>
      )}

      {tab === "profit" && (
        <div id="report-profit" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">تقرير الأرباح</h2>
            {profit?.summary ? (
              <p className="text-sm text-gray-500 mt-1">
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
                  {(profit.rows as Array<{ invoice_number: string; item_name: string; quantity: number; sale_price: number; cost_total: number; profit: number; created_at: string }>).map((r, i) => (
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
              <div className="p-12 text-center text-gray-500">لا توجد بيانات في الفترة المحددة</div>
            )}
          </div>
        </div>
      )}

      {tab === "inventory" && (
        <div id="report-inventory" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">أصناف تحت الحد الأدنى</h2>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {inventory?.lowStock && (inventory.lowStock as unknown[]).length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {(inventory.lowStock as Array<{ id: string; name: string; quantity: number; min_quantity: number }>).map((item) => (
                    <li key={item.id} className="p-4 flex justify-between">
                      <Link href={`/admin/inventory/${item.id}`} className="text-emerald-600 hover:underline">
                        {item.name}
                      </Link>
                      <span className="text-amber-600 font-medium">{item.quantity} / {item.min_quantity}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-8 text-center text-gray-500">لا توجد أصناف تحت الحد الأدنى</div>
              )}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">آخر حركات المخزون</h2>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {inventory?.movements && (inventory.movements as unknown[]).length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {(inventory.movements as Array<{ id: string; item_name: string; quantity: number; movement_type: string; created_at: string }>).map((m) => (
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
                <div className="p-8 text-center text-gray-500">لا توجد حركات</div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "workshop" && (
        <div id="report-workshop" className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-900 mb-4">المراحل</h2>
            <div className="flex flex-wrap gap-3">
              {workshop?.byStage
                ? Object.entries(workshop.byStage as Record<string, number>).map(([stage, cnt]) => (
                    <div key={stage} className="px-4 py-2 bg-gray-100 rounded-lg">
                      <span className="text-gray-600">{STAGE_LABELS[stage] || stage}</span>
                      <span className="font-bold mr-2">{cnt}</span>
                    </div>
                  ))
                : null}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">أوامر مكتملة في الفترة</h2>
              {workshop?.completedTotal != null ? (
                <p className="text-sm text-gray-500 mt-1">
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
                    {(workshop.completed as Array<{ id: string; order_number: string; vehicle_plate: string; completed_at: string; total: number }>).map((o) => (
                      <tr key={o.id} className="border-b border-gray-50">
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
                <div className="p-12 text-center text-gray-500">لا توجد أوامر مكتملة في الفترة</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

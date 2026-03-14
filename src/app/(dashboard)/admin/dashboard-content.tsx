"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Summary = {
  sales: { today: { total: number; count: number }; week: { total: number; count: number }; month: { total: number; count: number } };
  workshop: Record<string, number>;
  lowStockCount: number;
  pendingInvoices: { count: number; remaining: number };
  treasuries: Record<string, number>;
  dailySales: { day: string; total: number }[];
};

const STAGE_LABELS: Record<string, string> = {
  received: "مستلمة",
  inspection: "فحص",
  maintenance: "صيانة",
  ready: "جاهزة",
  completed: "مكتمل",
};

const TREASURY_LABELS: Record<string, string> = {
  sales: "خزينة المبيعات",
  workshop: "خزينة الورشة",
  main: "الخزينة الرئيسية",
};

export function DashboardContent() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/reports/summary")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">جاري التحميل...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-20 text-center text-gray-500">
        تعذر تحميل البيانات
      </div>
    );
  }

  const maxDaily = data.dailySales.length > 0 ? Math.max(...data.dailySales.map((d) => d.total), 1) : 1;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100">
          <p className="text-sm text-emerald-700">مبيعات اليوم</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">
            {data.sales.today.total.toLocaleString("ar-EG")} ج.م
          </p>
          <p className="text-xs text-emerald-600 mt-1">{data.sales.today.count} فاتورة</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
          <p className="text-sm text-blue-700">مبيعات الأسبوع</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">
            {data.sales.week.total.toLocaleString("ar-EG")} ج.م
          </p>
          <p className="text-xs text-blue-600 mt-1">{data.sales.week.count} فاتورة</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
          <p className="text-sm text-amber-700">مبيعات الشهر</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">
            {data.sales.month.total.toLocaleString("ar-EG")} ج.م
          </p>
          <p className="text-xs text-amber-600 mt-1">{data.sales.month.count} فاتورة</p>
        </div>
        <div className="bg-violet-50 rounded-xl p-5 border border-violet-100">
          <p className="text-sm text-violet-700">فواتير معلقة</p>
          <p className="text-2xl font-bold text-violet-900 mt-1">
            {data.pendingInvoices.remaining.toLocaleString("ar-EG")} ج.م
          </p>
          <p className="text-xs text-violet-600 mt-1">{data.pendingInvoices.count} فاتورة</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4">الخزائن</h3>
          <div className="space-y-3">
            {Object.entries(data.treasuries).map(([type, balance]) => (
              <div key={type} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span className="text-gray-700">{TREASURY_LABELS[type] || type}</span>
                <span className="font-medium text-gray-900">{balance.toLocaleString("ar-EG")} ج.م</span>
              </div>
            ))}
          </div>
          <Link
            href="/admin/treasuries"
            className="mt-4 inline-block text-sm text-emerald-600 hover:underline"
          >
            عرض الخزائن →
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4">الورشة</h3>
          <div className="space-y-2">
            {Object.entries(data.workshop).map(([stage, count]) => (
              <div key={stage} className="flex justify-between items-center">
                <span className="text-gray-700">{STAGE_LABELS[stage] || stage}</span>
                <span className="font-medium text-gray-900">{count}</span>
              </div>
            ))}
          </div>
          <Link
            href="/admin/workshop"
            className="mt-4 inline-block text-sm text-emerald-600 hover:underline"
          >
            عرض الورشة →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4">مبيعات آخر 7 أيام</h3>
          <div className="flex gap-2 h-36">
            {data.dailySales.length === 0 ? (
              <p className="text-gray-500 text-sm">لا توجد بيانات</p>
            ) : (
              data.dailySales.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col justify-end items-center gap-1 min-w-0">
                  <div
                    className="w-full bg-emerald-500 rounded-t min-h-[2px] transition-all"
                    style={{ height: `${Math.max(2, (d.total / maxDaily) * 100)}%` }}
                  />
                  <span className="text-xs text-gray-500 truncate w-full text-center">
                    {d.day.slice(5)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4">تنبيهات</h3>
          <div className="space-y-2">
            {data.lowStockCount > 0 && (
              <Link
                href="/admin/inventory"
                className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100 hover:bg-amber-100 transition"
              >
                <span className="text-amber-600 font-medium">⚠️ أصناف ناقصة</span>
                <span className="text-amber-800 font-bold">{data.lowStockCount}</span>
              </Link>
            )}
            {data.pendingInvoices.count > 0 && (
              <Link
                href="/admin/invoices"
                className="flex items-center gap-3 p-3 rounded-lg bg-violet-50 border border-violet-100 hover:bg-violet-100 transition"
              >
                <span className="text-violet-600 font-medium">فواتير معلقة</span>
                <span className="text-violet-800 font-bold">{data.pendingInvoices.count}</span>
              </Link>
            )}
            {data.lowStockCount === 0 && data.pendingInvoices.count === 0 && (
              <p className="text-gray-500 text-sm">لا توجد تنبيهات</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          href="/admin/cashier"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-emerald-200 transition block"
        >
          <h3 className="font-medium text-gray-900">الكاشير</h3>
          <p className="text-sm text-gray-500 mt-2">نقطة البيع والمبيعات</p>
        </Link>
        <Link
          href="/admin/inventory"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-emerald-200 transition block"
        >
          <h3 className="font-medium text-gray-900">المخزن</h3>
          <p className="text-sm text-gray-500 mt-2">إدارة الأصناف والمخزون</p>
        </Link>
        <Link
          href="/admin/workshop"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-emerald-200 transition block"
        >
          <h3 className="font-medium text-gray-900">الورشة</h3>
          <p className="text-sm text-gray-500 mt-2">أوامر الإصلاح والصيانة</p>
        </Link>
        <Link
          href="/admin/wallets"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-emerald-200 transition block"
        >
          <h3 className="font-medium text-gray-900">المحافظ</h3>
          <p className="text-sm text-gray-500 mt-2">شحن محافظ الشركات</p>
        </Link>
      </div>
    </div>
  );
}

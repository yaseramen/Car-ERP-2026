"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Summary = {
  canSee?: { sales: boolean; treasuries: boolean; workshop: boolean; inventory: boolean };
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

const BACKUP_REMINDER_DAYS = 7;

export function DashboardContent() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLastBackup(localStorage.getItem("alameen-last-backup"));
    } catch {}
  }, []);

  const needsBackupReminder = (() => {
    if (!lastBackup) return true;
    const diff = (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24);
    return diff >= BACKUP_REMINDER_DAYS;
  })();

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
        <p className="text-gray-500 dark:text-gray-400">جاري التحميل...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-20 text-center text-gray-500 dark:text-gray-400">
        تعذر تحميل البيانات
      </div>
    );
  }

  const maxDaily = data.dailySales.length > 0 ? Math.max(...data.dailySales.map((d) => d.total), 1) : 1;
  const c = data.canSee ?? { sales: true, treasuries: true, workshop: true, inventory: true };
  const hasAny = c.sales || c.treasuries || c.workshop || c.inventory;

  if (!hasAny) {
    return (
      <div className="py-20 text-center text-gray-500 dark:text-gray-400">
        <p>لا توجد صلاحيات لعرض لوحة التحكم.</p>
        <p className="text-sm mt-2">تواصل مع مديرك لإعطائك الصلاحيات المناسبة.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {needsBackupReminder && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-4 flex items-center justify-between gap-4">
          <p className="text-amber-800 dark:text-amber-200 text-sm">
            {lastBackup ? `لم تقم بنسخ احتياطي منذ ${Math.floor((Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24))} يوم.` : "لم تقم بنسخ احتياطي بعد."} يُنصح بعمل نسخة احتياطية دورياً.
          </p>
          <Link
            href="/admin/settings"
            className="shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
          >
            نسخ احتياطي
          </Link>
        </div>
      )}
      {c.sales && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-5 border border-emerald-100 dark:border-emerald-800">
            <p className="text-sm text-emerald-700 dark:text-emerald-300">مبيعات اليوم</p>
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">
              {data.sales.today.total.toLocaleString("ar-EG")} ج.م
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{data.sales.today.count} فاتورة</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-5 border border-blue-100 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">مبيعات الأسبوع</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
              {data.sales.week.total.toLocaleString("ar-EG")} ج.م
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{data.sales.week.count} فاتورة</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-5 border border-amber-100 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-300">مبيعات الشهر</p>
            <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">
              {data.sales.month.total.toLocaleString("ar-EG")} ج.م
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{data.sales.month.count} فاتورة</p>
          </div>
          <div className="bg-violet-50 dark:bg-violet-900/30 rounded-xl p-5 border border-violet-100 dark:border-violet-800">
            <p className="text-sm text-violet-700 dark:text-violet-300">فواتير معلقة</p>
            <p className="text-2xl font-bold text-violet-900 dark:text-violet-100 mt-1">
              {data.pendingInvoices.remaining.toLocaleString("ar-EG")} ج.م
            </p>
            <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">{data.pendingInvoices.count} فاتورة</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {c.treasuries && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">الخزائن</h3>
          <div className="space-y-3">
            {Object.entries(data.treasuries).map(([type, balance]) => (
              <div key={type} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-gray-700 dark:text-gray-300">{TREASURY_LABELS[type] || type}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{balance.toLocaleString("ar-EG")} ج.م</span>
              </div>
            ))}
          </div>
          <Link
            href="/admin/treasuries"
            className="mt-4 inline-block text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            عرض الخزائن →
          </Link>
        </div>
        )}

        {c.workshop && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">الورشة</h3>
          <div className="space-y-2">
            {Object.entries(data.workshop).map(([stage, count]) => (
              <div key={stage} className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">{STAGE_LABELS[stage] || stage}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{count}</span>
              </div>
            ))}
          </div>
          <Link
            href="/admin/workshop"
            className="mt-4 inline-block text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            عرض الورشة →
          </Link>
        </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {c.sales && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">مبيعات آخر 7 أيام</h3>
          <div className="flex gap-2 h-36">
            {data.dailySales.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">لا توجد بيانات</p>
            ) : (
              data.dailySales.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col justify-end items-center gap-1 min-w-0">
                  <div
                    className="w-full bg-emerald-500 rounded-t min-h-[2px] transition-all"
                    style={{ height: `${Math.max(2, (d.total / maxDaily) * 100)}%` }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate w-full text-center">
                    {d.day.slice(5)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">تنبيهات</h3>
          <div className="space-y-2">
            {c.inventory && data.lowStockCount > 0 && (
              <Link
                href="/admin/inventory"
                className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition"
              >
                <span className="text-amber-600 dark:text-amber-400 font-medium">⚠️ أصناف ناقصة</span>
                <span className="text-amber-800 dark:text-amber-200 font-bold">{data.lowStockCount}</span>
              </Link>
            )}
            {c.sales && data.pendingInvoices.count > 0 && (
              <Link
                href="/admin/invoices"
                className="flex items-center gap-3 p-3 rounded-lg bg-violet-50 dark:bg-violet-900/30 border border-violet-100 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition"
              >
                <span className="text-violet-600 dark:text-violet-400 font-medium">فواتير معلقة</span>
                <span className="text-violet-800 dark:text-violet-200 font-bold">{data.pendingInvoices.count}</span>
              </Link>
            )}
            {(!c.inventory || data.lowStockCount === 0) && (!c.sales || data.pendingInvoices.count === 0) && (
              <p className="text-gray-500 dark:text-gray-400 text-sm">لا توجد تنبيهات</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          href="/admin/cashier"
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-600 transition block"
        >
          <h3 className="font-medium text-gray-900 dark:text-gray-100">الكاشير</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">نقطة البيع والمبيعات</p>
        </Link>
        <Link
          href="/admin/inventory"
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-600 transition block"
        >
          <h3 className="font-medium text-gray-900 dark:text-gray-100">المخزن</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">إدارة الأصناف والمخزون</p>
        </Link>
        <Link
          href="/admin/workshop"
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-600 transition block"
        >
          <h3 className="font-medium text-gray-900 dark:text-gray-100">الورشة</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">أوامر الإصلاح والصيانة</p>
        </Link>
        <Link
          href="/admin/wallets"
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-600 transition block"
        >
          <h3 className="font-medium text-gray-900 dark:text-gray-100">المحافظ</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">شحن محافظ الشركات</p>
        </Link>
      </div>
    </div>
  );
}

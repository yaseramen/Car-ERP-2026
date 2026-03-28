"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useNotifications } from "@/components/notifications/notifications-provider";

const navItems: {
  href: string;
  label: string;
  module?: string;
  superAdminOnly?: boolean;
  ownerOrAdmin?: boolean;
  salesOnly?: boolean;
  serviceOnly?: boolean;
}[] = [
  { href: "/admin", label: "الرئيسية", module: "dashboard" },
  { href: "/admin/help", label: "الدليل وما الجديد", module: "dashboard" },
  { href: "/admin/inventory", label: "المخزن", module: "inventory" },
  { href: "/admin/inventory/price-list", label: "عرض أسعار", module: "inventory" },
  { href: "/admin/workshop", label: "الورشة", module: "workshop", serviceOnly: true },
  { href: "/admin/obd", label: "OBD", module: "obd", serviceOnly: true },
  { href: "/admin/cashier", label: "الكاشير", module: "cashier", salesOnly: true },
  { href: "/admin/purchases", label: "فواتير الشراء", module: "purchases", salesOnly: true },
  { href: "/admin/invoices", label: "الفواتير", module: "invoices" },
  { href: "/admin/customers", label: "العملاء", module: "customers" },
  { href: "/admin/suppliers", label: "الموردون", module: "suppliers" },
  { href: "/admin/reports", label: "التقارير", module: "reports" },
  { href: "/admin/treasuries", label: "الخزائن", module: "treasuries" },
  { href: "/admin/wallets", label: "المحافظ", module: "wallets", superAdminOnly: true },
  { href: "/admin/super/password-reset", label: "أكواد المالكين", module: "wallets", superAdminOnly: true },
  { href: "/admin/team", label: "المستخدمون", ownerOrAdmin: true },
  { href: "/admin/settings", label: "إعدادات الشركة", ownerOrAdmin: true },
  { href: "/admin/account/password", label: "تغيير كلمة المرور", ownerOrAdmin: true },
];

export function Sidebar({ role = "super_admin", businessType, companyName: initialCompanyName, onNavigate, onClose }: { role?: string; businessType?: string | null; companyName?: string | null; onNavigate?: () => void; onClose?: () => void }) {
  const [perms, setPerms] = useState<Record<string, { read: boolean }> | null>(null);
  const [canNotify, setCanNotify] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(initialCompanyName ?? null);
  const notifications = useNotifications();

  useEffect(() => {
    setCanNotify(typeof window !== "undefined" && "Notification" in window);
  }, []);

  useEffect(() => {
    setCompanyName(initialCompanyName ?? null);
  }, [initialCompanyName]);

  useEffect(() => {
    const fetchName = () => {
      if (role !== "super_admin") {
        fetch("/api/admin/me/company-name")
          .then((r) => r.json())
          .then((d) => { if (d.name) setCompanyName(d.name); })
          .catch(() => {});
      }
    };
    fetchName();
    const handler = (e: Event) => {
      const d = (e as CustomEvent<{ name: string }>)?.detail;
      if (d?.name) setCompanyName(d.name);
      else fetchName();
    };
    window.addEventListener("alameen-company-updated", handler);
    return () => window.removeEventListener("alameen-company-updated", handler);
  }, [role]);

  useEffect(() => {
    if (role === "employee") {
      fetch("/api/admin/me/permissions")
        .then((r) => r.json())
        .then((d) => setPerms(d.permissions || {}))
        .catch(() => setPerms({}));
    } else {
      setPerms(null);
    }
  }, [role]);

  const items = navItems.filter((item) => {
    if (item.superAdminOnly && role !== "super_admin") return false;
    if (item.ownerOrAdmin && role === "employee") return false;
    if (role === "super_admin") return true;
    if (businessType === "sales_only" && item.serviceOnly) return false;
    if (businessType === "service_only" && item.salesOnly) return false;
    if (role === "employee" && item.module && perms) {
      return perms[item.module]?.read === true;
    }
    return true;
  });
  const pathname = usePathname();

  const handleNav = () => {
    onNavigate?.();
    onClose?.();
  };

  return (
    <aside className="w-64 h-screen max-h-[100dvh] lg:min-h-screen lg:max-h-none bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col shrink-0 overflow-hidden">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2 shrink-0">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-gray-100">
            {companyName && role !== "super_admin" ? companyName : "EFCT"}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {role === "super_admin" ? "لوحة Super Admin" : role === "employee" ? "لوحة الموظف" : "لوحة المالك"}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="إغلاق القائمة"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <nav className="p-4 space-y-1">
          {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNav}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
        {notifications && canNotify && (
          <button
            type="button"
            onClick={() => notifications.requestPermission()}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-lg transition ${
              notifications.permission === "granted"
                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30"
                : "text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20"
            }`}
            title={notifications.permission === "granted" ? "الإشعارات مفعّلة" : "تفعيل الإشعارات"}
          >
            <span>{notifications.permission === "granted" ? "🔔" : "🔕"}</span>
            <span>{notifications.permission === "granted" ? "الإشعارات مفعّلة" : "تفعيل الإشعارات"}</span>
          </button>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
        >
          تسجيل الخروج
        </button>
        </div>
      </div>
    </aside>
  );
}

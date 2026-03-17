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
  { href: "/admin", label: "الرئيسية" },
  { href: "/admin/inventory", label: "المخزن", module: "inventory" },
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
  { href: "/admin/team", label: "المستخدمون", ownerOrAdmin: true },
  { href: "/admin/settings", label: "إعدادات الشركة", ownerOrAdmin: true },
];

export function Sidebar({ role = "super_admin", businessType }: { role?: string; businessType?: string | null }) {
  const [perms, setPerms] = useState<Record<string, { read: boolean }> | null>(null);
  const [canNotify, setCanNotify] = useState(false);
  const notifications = useNotifications();

  useEffect(() => {
    setCanNotify(typeof window !== "undefined" && "Notification" in window);
  }, []);

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

  return (
    <aside className="w-64 min-h-screen bg-white border-l border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">الأمين لخدمات السيارات</h2>
        <p className="text-xs text-gray-500 mt-1">{role === "super_admin" ? "لوحة Super Admin" : "لوحة المالك"}</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "bg-emerald-50 text-emerald-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 space-y-2">
        {notifications && canNotify && (
          <button
            type="button"
            onClick={() => notifications.requestPermission()}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-lg transition ${
              notifications.permission === "granted"
                ? "text-emerald-600 bg-emerald-50"
                : "text-gray-600 hover:text-violet-600 hover:bg-violet-50"
            }`}
            title={notifications.permission === "granted" ? "الإشعارات مفعّلة" : "تفعيل الإشعارات"}
          >
            <span>{notifications.permission === "granted" ? "🔔" : "🔕"}</span>
            <span>{notifications.permission === "granted" ? "الإشعارات مفعّلة" : "تفعيل الإشعارات"}</span>
          </button>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
        >
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}

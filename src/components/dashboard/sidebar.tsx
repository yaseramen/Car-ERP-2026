"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/admin", label: "الرئيسية", labelEn: "Dashboard" },
  { href: "/admin/inventory", label: "المخزن", labelEn: "Inventory" },
  { href: "/admin/workshop", label: "الورشة", labelEn: "Workshop" },
  { href: "/admin/wallets", label: "المحافظ", labelEn: "Wallets" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-white border-l border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">الأمين لخدمات السيارات</h2>
        <p className="text-xs text-gray-500 mt-1">لوحة Super Admin</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
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

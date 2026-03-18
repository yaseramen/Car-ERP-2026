"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { DashboardHeader } from "./dashboard-header";

export function AdminLayoutClient({
  children,
  role,
  businessType,
}: {
  children: React.ReactNode;
  role: string;
  businessType: string | null;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col" dir="rtl">
      <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Overlay على الهاتف عند فتح القائمة */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* الشريط الجانبي: على الهاتف يكون overlay، على الشاشات الكبيرة ثابت */}
        <aside
          className={`
            fixed md:relative inset-y-0 right-0 z-50 md:z-auto
            w-72 md:w-64 min-h-screen
            bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700
            flex flex-col
            transform transition-transform duration-200 ease-out
            md:transform-none
            ${sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
          `}
        >
          <Sidebar
            role={role}
            businessType={businessType}
            onNavigate={() => setSidebarOpen(false)}
            onClose={() => setSidebarOpen(false)}
          />
        </aside>

        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

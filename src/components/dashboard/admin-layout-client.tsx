"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { DashboardHeader } from "./dashboard-header";
import { AssistantWidget } from "./assistant-widget";
import { ReleaseNotesBanner } from "./release-notes-banner";
import { OfflineStatusBar } from "@/components/offline/offline-status-bar";

export function AdminLayoutClient({
  children,
  role,
  businessType,
  companyName,
}: {
  children: React.ReactNode;
  role: string;
  businessType: string | null;
  companyName: string | null;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col" dir="rtl">
      <ReleaseNotesBanner />
      <OfflineStatusBar />
      <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Overlay على الهاتف والتابلت عند فتح القائمة */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* الشريط الجانبي: على الهاتف/تابلت يطوى ويظهر كـ overlay، على الشاشات الكبيرة ثابت */}
        <aside
          className={`
            fixed lg:relative inset-y-0 right-0 z-50 lg:z-auto
            w-72 lg:w-64 min-h-screen
            bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700
            flex flex-col
            transform transition-transform duration-200 ease-out
            lg:transform-none
            ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
          `}
        >
          <Sidebar
            role={role}
            businessType={businessType}
            companyName={companyName}
            onNavigate={() => setSidebarOpen(false)}
            onClose={() => setSidebarOpen(false)}
          />
        </aside>

        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950 min-w-0">
          {children}
        </main>
      </div>
      <AssistantWidget />
    </div>
  );
}

"use client";

import { signOut } from "next-auth/react";

interface AdminDashboardProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            لوحة Super Admin - شحن المحافظ
          </h1>
          <p className="text-gray-500 mt-1">مرحباً، {user.name || user.email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
        >
          تسجيل الخروج
        </button>
      </header>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <p className="text-gray-600">
          لوحة إدارة شحن محافظ الشركات ستكون متاحة هنا.
        </p>
      </div>
    </div>
  );
}

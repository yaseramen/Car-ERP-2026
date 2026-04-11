"use client";

import { signOut } from "next-auth/react";
import { getSupportFooterSentence } from "@/lib/support-contact";

type Props = {
  /** من الجلسة في الخادم — يحدد نبرة الرسالة */
  viewerRole?: string | null;
};

export function DbUnavailableBlock({ viewerRole }: Props) {
  const isOwnerOrAdmin = viewerRole === "super_admin" || viewerRole === "tenant_owner";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-lg w-full text-center space-y-5">
        <div className="text-5xl" aria-hidden>
          🔌
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {isOwnerOrAdmin ? "تعذر الاتصال بقاعدة البيانات" : "الخدمة غير متاحة مؤقتاً"}
        </h1>
        {isOwnerOrAdmin ? (
          <>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              الخادم لا يستطيع الوصول إلى قاعدة البيانات. غالباً السبب إعدادات الاستضافة (رابط Turso أو رمز المصادقة في Vercel).
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              تحقق من <code className="rounded bg-gray-200 dark:bg-gray-800 px-1">TURSO_DATABASE_URL</code> و
              <code className="rounded bg-gray-200 dark:bg-gray-800 px-1">TURSO_AUTH_TOKEN</code> ثم أعد النشر.
            </p>
          </>
        ) : (
          <>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              لا يمكن تحميل البيانات الآن. تم تسجيل المشكلة على الخادم — يرجى إبلاغ مدير النظام.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">ستعود الخدمة بعد إصلاح الاتصال من قبل الإدارة.</p>
          </>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-400">{getSupportFooterSentence()}</p>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
        >
          العودة لتسجيل الدخول
        </button>
      </div>
    </div>
  );
}

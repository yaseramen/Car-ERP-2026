"use client";

import { signOut } from "next-auth/react";

/** يُعرض عند فشل الاتصال بقاعدة البيانات (Turso) من الخادم — بدلاً من صفحة خطأ عامة */
export function DbUnavailableBlock() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-lg w-full text-center space-y-5">
        <div className="text-5xl" aria-hidden>
          🔌
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">تعذر الاتصال بقاعدة البيانات</h1>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          الخادم لا يستطيع الوصول إلى قاعدة البيانات الآن. غالباً السبب إعدادات Turso على Vercel (رابط قاعدة البيانات أو
          رمز المصادقة غير صحيح أو منتهي).
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          من يدير الاستضافة: تحقق من <code className="rounded bg-gray-200 dark:bg-gray-800 px-1">TURSO_DATABASE_URL</code> و
          <code className="rounded bg-gray-200 dark:bg-gray-800 px-1">TURSO_AUTH_TOKEN</code> في Vercel ثم أعد النشر.
        </p>
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

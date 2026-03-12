import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white p-8" dir="rtl">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          الأمين لخدمات السيارات
        </h1>
        <p className="text-gray-600 mb-8">
          منصة متكاملة لإدارة مراكز خدمة السيارات
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-emerald-600/25"
        >
          دخول للنظام
        </Link>
      </div>
    </div>
  );
}

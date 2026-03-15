import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white p-8" dir="rtl">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          الأمين لخدمات السيارات
        </h1>
        <p className="text-gray-600 mb-8">
          منصة متكاملة لإدارة محلات بيع قطع الغيار ومراكز خدمة السيارات
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-emerald-600/25"
          >
            دخول للنظام
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-medium rounded-xl transition-colors"
          >
            تسجيل شركة جديدة
          </Link>
        </div>
      </div>
    </div>
  );
}

import { auth } from "@/auth";

export default async function AdminDashboardPage() {
  const session = await auth();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">الرئيسية</h1>
        <p className="text-gray-500 mt-1">مرحباً، {session?.user?.name || session?.user?.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <a href="/admin/inventory" className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-emerald-200 transition">
          <h3 className="font-medium text-gray-900">المخزن</h3>
          <p className="text-sm text-gray-500 mt-2">إدارة الأصناف والمخزون</p>
        </a>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-medium text-gray-900">الورشة</h3>
          <p className="text-sm text-gray-500 mt-2">أوامر الإصلاح والصيانة</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-medium text-gray-900">المحافظ</h3>
          <p className="text-sm text-gray-500 mt-2">شحن محافظ الشركات</p>
        </div>
      </div>
    </div>
  );
}

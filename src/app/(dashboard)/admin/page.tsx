import { auth } from "@/auth";
import { DashboardContent } from "./dashboard-content";

export default async function AdminDashboardPage() {
  const session = await auth();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">الرئيسية</h1>
        <p className="text-gray-500 mt-1">مرحباً، {session?.user?.name || session?.user?.email}</p>
      </div>

      <DashboardContent />
    </div>
  );
}

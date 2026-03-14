import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ReportsContent } from "./reports-content";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    redirect("/login");
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">التقارير</h1>
        <p className="text-gray-500 mt-1">نظرة على أداء النظام واتخاذ القرارات</p>
      </div>

      <ReportsContent />
    </div>
  );
}

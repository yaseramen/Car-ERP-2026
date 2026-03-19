import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardContent } from "./dashboard-content";
import { canAccess, getFirstAllowedRoute } from "@/lib/permissions";
import { getCompanyId } from "@/lib/company";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user || !["super_admin", "tenant_owner", "employee"].includes(session.user.role ?? "")) {
    redirect("/login");
  }

  const companyId = getCompanyId(session);
  if (!companyId) redirect("/login");

  if (session.user.role === "employee") {
    const allowed = await canAccess(session.user.id, "employee", companyId, "dashboard", "read");
    if (!allowed) {
      const firstRoute = await getFirstAllowedRoute(session.user.id);
      if (firstRoute) redirect(firstRoute);
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">الرئيسية</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">مرحباً، {session?.user?.name || session?.user?.email}</p>
      </div>

      <DashboardContent />
    </div>
  );
}

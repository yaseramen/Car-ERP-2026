import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { NotificationsProvider } from "@/components/notifications/notifications-provider";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || !["super_admin", "tenant_owner", "employee"].includes(session.user.role)) {
    redirect("/login");
  }

  return (
    <NotificationsProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col" dir="rtl">
        <DashboardHeader />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar role={session.user.role} businessType={session.user.companyBusinessType} />
          <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">{children}</main>
        </div>
      </div>
    </NotificationsProvider>
  );
}

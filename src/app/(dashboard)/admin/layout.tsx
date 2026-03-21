import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AdminLayoutClient } from "@/components/dashboard/admin-layout-client";
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
      <AdminLayoutClient
        role={session.user.role ?? "employee"}
        businessType={session.user.companyBusinessType ?? null}
        companyName={session.user.companyName ?? null}
      >
        {children}
      </AdminLayoutClient>
    </NotificationsProvider>
  );
}

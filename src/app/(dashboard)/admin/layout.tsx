import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { AdminLayoutClient } from "@/components/dashboard/admin-layout-client";
import { NotificationsProvider } from "@/components/notifications/notifications-provider";
import { ChargeRequiredBlock } from "@/components/charge-required-block";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || !["super_admin", "tenant_owner", "employee"].includes(session.user.role)) {
    redirect("/login");
  }

  /** رصيد المحفظة ≤ 0: إيقاف البرنامج للمستأجر (عدا super_admin) — انظر ChargeRequiredBlock */
  let showChargeRequired = false;
  if (session.user.role !== "super_admin" && session.user.companyId) {
    const wallet = await db.execute({
      sql: "SELECT balance FROM company_wallets WHERE company_id = ?",
      args: [session.user.companyId],
    });
    const balance = wallet.rows[0] ? Number(wallet.rows[0].balance ?? 0) : 0;
    if (balance <= 0) showChargeRequired = true;
  }

  if (showChargeRequired) {
    return <ChargeRequiredBlock />;
  }

  let companyLogoUrl: string | null = null;
  if (session.user.companyId) {
    const br = await db.execute({
      sql: "SELECT logo_url FROM companies WHERE id = ?",
      args: [session.user.companyId],
    });
    const u = br.rows[0]?.logo_url;
    companyLogoUrl = u ? String(u) : null;
  }

  return (
    <NotificationsProvider>
      <AdminLayoutClient
        role={session.user.role ?? "employee"}
        businessType={session.user.companyBusinessType ?? null}
        companyName={session.user.companyName ?? null}
        companyLogoUrl={companyLogoUrl}
      >
        {children}
      </AdminLayoutClient>
    </NotificationsProvider>
  );
}

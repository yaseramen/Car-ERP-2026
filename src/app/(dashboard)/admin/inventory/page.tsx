import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/permissions";
import { InventoryTable } from "./inventory-table";

export default async function InventoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const allowed = session.user.role === "super_admin" || session.user.role === "tenant_owner" ||
    (session.user.role === "employee" && session.user.id && await canAccess(session.user.id, session.user.role ?? "", session.user.companyId ?? null, "inventory", "read"));
  if (!allowed) redirect("/login");

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">المخزن</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة الأصناف والمخزون</p>
        </div>
      </div>

      <InventoryTable />
    </div>
  );
}

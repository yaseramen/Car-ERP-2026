import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { InventoryTable } from "./inventory-table";

export default async function InventoryPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    redirect("/login");
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">المخزن</h1>
          <p className="text-gray-500 mt-1">إدارة الأصناف والمخزون</p>
        </div>
      </div>

      <InventoryTable />
    </div>
  );
}

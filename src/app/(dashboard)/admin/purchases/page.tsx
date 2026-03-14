import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PurchasesContent } from "./purchases-content";

export default async function PurchasesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    redirect("/login");
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">فواتير الشراء</h1>
        <p className="text-gray-500 mt-1">تسجيل مشتريات المخزون من الموردين</p>
      </div>

      <PurchasesContent />
    </div>
  );
}

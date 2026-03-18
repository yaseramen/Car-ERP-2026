import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { InvoicesContent } from "./invoices-content";

export default async function InvoicesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    redirect("/login");
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">الفواتير</h1>
        <p className="text-gray-500 mt-1">عرض وإدارة الفواتير</p>
      </div>

      <InvoicesContent />
    </div>
  );
}

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CustomersContent } from "./customers-content";

export default async function CustomersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    redirect("/login");
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">العملاء</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة العملاء وربطهم بأوامر الإصلاح والفواتير</p>
      </div>

      <CustomersContent />
    </div>
  );
}

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { WalletsContent } from "./wallets-content";

export default async function WalletsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    redirect("/login");
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">المحافظ</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">شحن محافظ الشركات - للتواصل مع المالك: 01009376052</p>
      </div>

      <WalletsContent />
    </div>
  );
}

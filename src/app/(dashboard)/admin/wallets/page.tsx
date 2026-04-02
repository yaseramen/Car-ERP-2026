import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { WalletsContent } from "./wallets-content";

export default async function WalletsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  if (role === "employee") redirect("/admin");

  const isSuper = role === "super_admin";
  const isOwner = role === "tenant_owner";
  if (!isSuper && !isOwner) redirect("/login");

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">المحافظ</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {isSuper
            ? "شحن محافظ الشركات - للتواصل مع المالك: 01009376052"
            : "عرض رصيد محفظة شركتك وسجل الشحن والخصومات (القراءة فقط). لشحن الرصيد يتواصل مع إدارة المنصة."}
        </p>
      </div>

      <WalletsContent readOnly={isOwner} />
    </div>
  );
}

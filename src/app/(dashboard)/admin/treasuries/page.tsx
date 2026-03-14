import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TreasuriesContent } from "./treasuries-content";

export default async function TreasuriesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    redirect("/login");
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">الخزائن</h1>
        <p className="text-gray-500 mt-1">فصل خزينة المبيعات عن خزينة الورشة — التحويل بينهما</p>
      </div>

      <TreasuriesContent />
    </div>
  );
}

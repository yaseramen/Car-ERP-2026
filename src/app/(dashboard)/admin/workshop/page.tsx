import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { WorkshopContent } from "./workshop-content";

export default async function WorkshopPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    redirect("/login");
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">الورشة</h1>
        <p className="text-gray-500 mt-1">
          دورة السيارة: استلام → فحص → صيانة → جاهزة → فاتورة وخروج
        </p>
      </div>

      <WorkshopContent />
    </div>
  );
}

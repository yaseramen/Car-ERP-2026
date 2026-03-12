import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AdminDashboard } from "./admin-dashboard";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminDashboard user={session.user} />
    </div>
  );
}

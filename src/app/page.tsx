import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Super Admin يُوجّه عبر middleware إلى /admin
  if (session.user.role === "super_admin") {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold">لوحة التحكم - الأمين لخدمات السيارات</h1>
      <p className="text-gray-600 mt-2">مرحباً، {session.user.name || session.user.email}</p>
    </div>
  );
}

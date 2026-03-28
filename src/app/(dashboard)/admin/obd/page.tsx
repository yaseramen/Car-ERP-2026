import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ObdContent } from "./obd-content";
import { canAccess } from "@/lib/permissions";
import { getCompanyId } from "@/lib/company";

export default async function ObdPage() {
  const session = await auth();
  if (!session?.user || !["super_admin", "tenant_owner", "employee"].includes(session.user.role ?? "")) {
    redirect("/login");
  }

  const companyId = getCompanyId(session);
  if (!companyId) redirect("/login");

  if (session.user.role === "employee") {
    const allowed = await canAccess(session.user.id, "employee", companyId, "obd", "read");
    if (!allowed) redirect("/admin");
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">التشخيص الذكي OBD</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          بحث بكود، رفع تقرير، إدخال عدة أكواد يدوياً مع نوع السيارة بالعربي، تحليل بالوصف، أو لصق/رفع نص قراءات حية — 1 ج.م لكل كود أو تحليل نصي
        </p>
      </div>

      <ObdContent />
    </div>
  );
}

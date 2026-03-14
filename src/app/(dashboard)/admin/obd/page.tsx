import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ObdContent } from "./obd-content";

export default async function ObdPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    redirect("/login");
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">التشخيص الذكي OBD</h1>
        <p className="text-gray-500 mt-1">
          بحث بكود، رفع تقرير PDF/صورة، أو تحليل بالوصف — مع استخراج الماركة والنموذج والسنة (1 ج.م/عملية)
        </p>
      </div>

      <ObdContent />
    </div>
  );
}

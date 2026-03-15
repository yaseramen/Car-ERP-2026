import type { Session } from "next-auth";

const SYSTEM_COMPANY_ID = "company-system";

/**
 * يُرجع company_id للاستخدام في استعلامات API.
 * - super_admin: company-system (للوصول للنظام التجريبي)
 * - tenant_owner / employee: company_id من الجلسة
 */
export function getCompanyId(session: Session | null): string | null {
  if (!session?.user) return null;
  if (session.user.role === "super_admin") return SYSTEM_COMPANY_ID;
  return session.user.companyId ?? null;
}

export function requireCompanyId(session: Session | null): string {
  const id = getCompanyId(session);
  if (!id) throw new Error("غير مصرح");
  return id;
}

export { SYSTEM_COMPANY_ID };

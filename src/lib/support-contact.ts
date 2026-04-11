/**
 * نصوص دعم المستخدم (اختياري) — عرّف في Vercel:
 * NEXT_PUBLIC_SUPPORT_PHONE و/أو NEXT_PUBLIC_SUPPORT_EMAIL
 */
export function getSupportContactLine(): string | null {
  const phone = process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim();
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  if (!phone && !email) return null;
  const bits: string[] = [];
  if (phone) bits.push(`هاتف: ${phone}`);
  if (email) bits.push(`بريد: ${email}`);
  return bits.join(" — ");
}

/** سطر جاهز للواجهة */
export function getSupportFooterSentence(): string {
  const line = getSupportContactLine();
  if (line) return `إن استمرت المشكلة، تواصل مع الدعم: ${line}.`;
  return "إن استمرت المشكلة، أبلغ مدير النظام أو فريق الدعم لديك.";
}

/** مسار الخلفية الافتراضية المدمجة (SVG داكن — لا يحتاج رفع ملف) */
export const HERO_SVG_FALLBACK_PATH = "/marketing/hero-home.svg";

/**
 * مصادر الصورة بالترتيب:
 * 1) NEXT_PUBLIC_MARKETING_HERO_URL إن وُجد (صورة فوتوغرافية من CDN/Blob)
 * 2) SVG المدمج فقط — لا نطلب hero-main.webp تلقائياً لتجنب 404 في المتصفح
 */
export function buildMarketingHeroSrcList(): string[] {
  const list: string[] = [];
  const env =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_MARKETING_HERO_URL
      ? process.env.NEXT_PUBLIC_MARKETING_HERO_URL.trim()
      : "";
  if (env) {
    try {
      if (env.startsWith("/")) list.push(env);
      else {
        new URL(env);
        list.push(env);
      }
    } catch {
      /* ignore */
    }
  }
  list.push(HERO_SVG_FALLBACK_PATH);
  return list;
}

/** الخلفية الافتراضية داكنة — نص الهيرو يبقى فاتحاً */
export const HERO_DEFAULT_IS_DARK = true;

/** مسار الخلفية الافتراضية المدمجة (SVG — يظهر حتى قبل رفع صورة الترويج) */
export const HERO_SVG_FALLBACK_PATH = "/marketing/hero-home.svg";

/** اسم الملف الموصى به لصورة البانر الترويجية (ارفعها من GitHub → public/marketing/) */
export const HERO_PROMO_WEBP_PATH = "/marketing/efct-promo-hero.webp";
export const HERO_PROMO_JPG_PATH = "/marketing/efct-promo-hero.jpg";

/**
 * مصادر الصورة بالترتيب:
 * 1) NEXT_PUBLIC_MARKETING_HERO_URL
 * 2) efct-promo-hero.webp / .jpg (بعد رفع الملف منك)
 * 3) SVG المدمج
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
  if (!list.includes(HERO_PROMO_WEBP_PATH)) list.push(HERO_PROMO_WEBP_PATH);
  if (!list.includes(HERO_PROMO_JPG_PATH)) list.push(HERO_PROMO_JPG_PATH);
  list.push(HERO_SVG_FALLBACK_PATH);
  return list;
}

/** الخلفية الافتراضية داكنة — نص الهيرو يبقى فاتحاً */
export const HERO_DEFAULT_IS_DARK = true;

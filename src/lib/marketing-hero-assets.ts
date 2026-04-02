/** مسارات محلية بالترتيب — ضع صورة الترويج هنا باسم hero-main.webp أو hero-main.jpg */
export const HERO_LOCAL_PHOTO_PATHS = ["/marketing/hero-main.webp", "/marketing/hero-main.jpg", "/marketing/hero-home.webp"] as const;

export const HERO_SVG_FALLBACK_PATH = "/marketing/hero-home.svg";

/**
 * قائمة مصادر الصورة: رابط البيئة (اختياري) ثم ملفات محلية ثم SVG.
 * يُبنى على العميل لقراءة NEXT_PUBLIC_* في المتصفح.
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
  for (const p of HERO_LOCAL_PHOTO_PATHS) {
    if (!list.includes(p)) list.push(p);
  }
  if (!list.includes(HERO_SVG_FALLBACK_PATH)) list.push(HERO_SVG_FALLBACK_PATH);
  return list;
}

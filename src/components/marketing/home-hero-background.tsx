import { HERO_SVG_FALLBACK_PATH, HERO_WEBP_PATH } from "@/lib/marketing-hero-assets";

/**
 * خلفية قسم الـ Hero: WebP إن وُجد، وإلا SVG مدمج (بدون طلب فاشل).
 * طبقة فوق الصورة أخف حتى تُرى الخلفية خلف النصوص.
 */
export function HomeHeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <picture className="absolute inset-0 block h-full w-full">
        <source srcSet={HERO_WEBP_PATH} type="image/webp" />
        <img
          src={HERO_SVG_FALLBACK_PATH}
          alt=""
          className="h-full w-full object-cover object-center"
          decoding="async"
          fetchPriority="high"
        />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-emerald-50/35 to-white/65" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white via-white/70 to-transparent" />
    </div>
  );
}

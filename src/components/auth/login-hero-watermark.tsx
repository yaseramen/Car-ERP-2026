import { HERO_SVG_FALLBACK_PATH, HERO_WEBP_PATH } from "@/lib/marketing-hero-assets";

/** علامة مائية خلف تسجيل الدخول — WebP إن وُجد، وإلا SVG المدمج */
export function LoginHeroWatermark() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 opacity-[0.22] dark:opacity-[0.18]">
        <picture className="block h-full w-full">
          <source srcSet={HERO_WEBP_PATH} type="image/webp" />
          <img
            src={HERO_SVG_FALLBACK_PATH}
            alt=""
            className="h-full w-full object-cover object-center scale-105"
            loading="lazy"
            decoding="async"
          />
        </picture>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50/88 via-white/80 to-gray-100/88 dark:from-gray-950/92 dark:via-gray-900/85 dark:to-gray-950/92" />
    </div>
  );
}

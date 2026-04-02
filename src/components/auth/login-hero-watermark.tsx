"use client";

import Image from "next/image";
import { useState } from "react";

/** نفس مسار الصفحة الرئيسية — ضع الملف: public/marketing/hero-home.webp */
const HERO_PATH = "/marketing/hero-home.webp";

/**
 * علامة مائية خفيفة خلف نموذج تسجيل الدخول.
 * بدون priority لتأخير التحميل قليلاً عن المحتوى التفاعلي؛ جودة منخفضة لتقليل الحجم.
 */
export function LoginHeroWatermark() {
  const [failed, setFailed] = useState(false);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {!failed && (
        <div className="absolute inset-0 opacity-[0.14] dark:opacity-[0.12]">
          <Image
            src={HERO_PATH}
            alt=""
            fill
            className="object-cover object-center scale-105"
            sizes="(max-width: 640px) 100vw, 720px"
            quality={55}
            loading="lazy"
            onError={() => setFailed(true)}
          />
        </div>
      )}
      <div
        className={
          failed
            ? "absolute inset-0 bg-gradient-to-br from-emerald-50/90 via-gray-50 to-sky-50/80 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950/40"
            : "absolute inset-0 bg-gradient-to-b from-gray-50/92 via-white/88 to-gray-100/90 dark:from-gray-950/95 dark:via-gray-900/90 dark:to-gray-950/95"
        }
      />
    </div>
  );
}

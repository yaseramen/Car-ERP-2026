"use client";

import Image from "next/image";
import { useState } from "react";

const HERO_PATH = "/marketing/hero-home.webp";

/**
 * خلفية كاملة لقسم الـ Hero فقط — Next/Image مع طبقة فوق الصورة لقراءة النص.
 * ضع الملف: public/marketing/hero-home.webp (مُصدَّر WebP).
 */
export function HomeHeroBackground() {
  const [failed, setFailed] = useState(false);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {!failed && (
        <Image
          src={HERO_PATH}
          alt=""
          fill
          className="object-cover object-center"
          sizes="100vw"
          priority
          fetchPriority="high"
          quality={75}
          onError={() => setFailed(true)}
        />
      )}
      {/* طبقة فوق الصورة: بدون صورة تظهر تدرجاً هادئاً فقط */}
      <div
        className={
          failed
            ? "absolute inset-0 bg-gradient-to-b from-emerald-100/95 via-white to-emerald-50/90"
            : "absolute inset-0 bg-gradient-to-b from-white/90 via-emerald-50/82 to-white/95"
        }
      />
      {/* تعتيم خفيف أسفل القسم لتمييز الانتقال للمحتوى التالي */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
    </div>
  );
}

"use client";

import Image from "next/image";
import { useState } from "react";

/** ضع الصورة المحسّنة (WebP) هنا — لا تُحمَّل إلا على الصفحة الرئيسية */
const HERO_PATH = "/marketing/hero-home.webp";

export function HomeHeroVisual() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="relative w-full max-w-2xl mx-auto aspect-[16/10] rounded-2xl border border-emerald-900/15 bg-gradient-to-br from-emerald-950/30 via-slate-900/40 to-emerald-900/20 flex items-center justify-center px-6 text-center"
        role="img"
        aria-label="مكان صورة التعريف"
      >
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          لإظهار الصورة الترويجية: صدّرها كـ WebP وضع الملف في المسار{" "}
          <code className="text-xs bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded">public/marketing/hero-home.webp</code>
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto aspect-[16/10] rounded-2xl overflow-hidden shadow-xl shadow-emerald-900/15 ring-1 ring-black/5 dark:ring-white/10">
      <Image
        src={HERO_PATH}
        alt="EFCT — نظام إدارة مراكز صيانة السيارات: تشخيص OBD، مخزون، وفواتير"
        fill
        className="object-cover object-center"
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 640px"
        priority
        fetchPriority="high"
        quality={80}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

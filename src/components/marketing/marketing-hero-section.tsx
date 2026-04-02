"use client";

import type { ReactNode } from "react";

const SECTION_X = "px-4 sm:px-6 md:px-10 lg:px-12";

/** قسم الهيرو — الخلفية من MarketingPageBackdrop (ملء الشاشة). نص فاتح فوق التعتيم. */
export function MarketingHeroSection({ children }: { children: ReactNode }) {
  return (
    <section
      className={`relative z-10 min-h-[100dvh] flex flex-col justify-center py-14 sm:py-20 md:py-20 lg:py-24 ${SECTION_X} text-white`}
    >
      <div className="max-w-3xl sm:max-w-4xl md:max-w-5xl mx-auto text-center [&_h1]:text-white [&_h1]:drop-shadow-[0_2px_14px_rgba(0,0,0,0.9)] [&_p]:text-emerald-50 [&_strong]:text-white [&_.hero-subtext]:text-emerald-100/95 [&_a.text-sky-800]:!text-sky-200 [&_a.text-sky-800:hover]:!text-white [&_a.border-sky-600]:!border-sky-300/90 [&_a.border-sky-600]:!text-sky-50 [&_a.border-sky-600]:!bg-sky-950/30 [&_a.border-emerald-700]:!border-white/90 [&_a.border-emerald-700]:!text-white [&_a.border-emerald-700]:!bg-white/15">
        {children}
      </div>
    </section>
  );
}

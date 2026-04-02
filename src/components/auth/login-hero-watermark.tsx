"use client";

import { HeroPhotoStack } from "@/components/marketing/hero-photo-stack";

export function LoginHeroWatermark() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 opacity-[0.35] dark:opacity-[0.32]">
        <HeroPhotoStack className="h-full w-full object-cover object-center scale-105" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50/80 via-white/72 to-gray-100/85 dark:from-gray-950/88 dark:via-gray-900/78 dark:to-gray-950/90" />
    </div>
  );
}

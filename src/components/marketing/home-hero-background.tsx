"use client";

import { HeroPhotoStack } from "./hero-photo-stack";

export function HomeHeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <HeroPhotoStack className="absolute inset-0 h-full w-full object-cover object-center" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/50" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-white via-white/75 to-transparent dark:from-gray-950 dark:via-gray-950/80" />
    </div>
  );
}

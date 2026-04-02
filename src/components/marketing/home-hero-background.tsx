"use client";

import { HeroPhotoStack } from "./hero-photo-stack";

type Props = {
  onRasterLoaded?: (isRaster: boolean) => void;
};

export function HomeHeroBackground({ onRasterLoaded }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <HeroPhotoStack
        className="absolute inset-0 h-full w-full object-cover object-center"
        onRasterLoaded={onRasterLoaded}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-emerald-950/25 to-white/82 dark:from-black/55 dark:via-gray-950/35 dark:to-gray-950/88" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white via-white/88 to-transparent dark:from-gray-950 dark:via-gray-950/85" />
    </div>
  );
}

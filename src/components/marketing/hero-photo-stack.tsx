"use client";

import { useMemo, useState, useEffect } from "react";
import { buildMarketingHeroSrcList, HERO_SVG_FALLBACK_PATH } from "@/lib/marketing-hero-assets";

type Props = {
  className?: string;
  onRasterLoaded?: (isRaster: boolean) => void;
};

/** يجرّب مصادر الصورة بالترتيب حتى ينجح تحميل واحد */
export function HeroPhotoStack({ className = "", onRasterLoaded }: Props) {
  const candidates = useMemo(() => buildMarketingHeroSrcList(), []);
  const [index, setIndex] = useState(0);
  const src = candidates[index] ?? HERO_SVG_FALLBACK_PATH;

  useEffect(() => {
    const isSvg = src.includes(".svg");
    onRasterLoaded?.(!isSvg);
  }, [src, onRasterLoaded]);

  return (
    <img
      key={src}
      src={src}
      alt=""
      className={className}
      decoding="async"
      fetchPriority="high"
      onError={() => {
        setIndex((i) => Math.min(i + 1, candidates.length - 1));
      }}
    />
  );
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  // استخدام مسارات نسبية ليبقى المستخدم على النطاق الحالي (car.aiverce.com)
  // وعدم إجبار إعادة التوجيه إلى vercel.app
  return {
    id: "/",
    name: "الأمين لخدمات السيارات",
    short_name: "الأمين",
    description: "منصة SaaS متكاملة لإدارة مراكز خدمة السيارات",
    start_url: "/",
    display: "standalone",
    background_color: "#2563eb",
    theme_color: "#2563eb",
    orientation: "any",
    lang: "ar",
    dir: "rtl",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}

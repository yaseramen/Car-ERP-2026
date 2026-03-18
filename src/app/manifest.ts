import type { MetadataRoute } from "next";

function getBaseUrl(): string {
  if (typeof process.env.VERCEL_URL === "string" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (typeof process.env.NEXT_PUBLIC_APP_URL === "string" && process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  return "";
}

export default function manifest(): MetadataRoute.Manifest {
  const base = getBaseUrl();
  const icon = (path: string) => (base ? `${base}${path}` : path);

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
      {
        src: icon("/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: icon("/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: icon("/icon.svg"),
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}

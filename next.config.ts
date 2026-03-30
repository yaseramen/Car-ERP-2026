import type { NextConfig } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

const nextConfig: NextConfig = {
  env: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    // استخدام النطاق المخصص إن وُجد — يمنع إعادة التوجيه إلى vercel.app
    AUTH_URL: process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL,
  },
  /** يقلّل تحذير «الاتصال غير آمن» على التابلت عند فتح http:// بدل https:// */
  async redirects() {
    if (!appUrl.startsWith("https://")) return [];
    return [
      {
        source: "/:path*",
        has: [{ type: "header" as const, key: "x-forwarded-proto", value: "http" }],
        destination: `${appUrl}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    // استخدام النطاق المخصص إن وُجد — يمنع إعادة التوجيه إلى vercel.app
    AUTH_URL: process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL,
  },
};

export default nextConfig;

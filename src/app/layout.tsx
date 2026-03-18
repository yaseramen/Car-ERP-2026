import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { PwaProvider } from "@/components/pwa/pwa-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const metadataBase =
  typeof process.env.VERCEL_URL === "string" && process.env.VERCEL_URL
    ? new URL(`https://${process.env.VERCEL_URL}`)
    : typeof process.env.NEXT_PUBLIC_APP_URL === "string" && process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ""))
      : undefined;

export const metadata: Metadata = {
  metadataBase: metadataBase ?? new URL("http://localhost:3000"),
  title: "الأمين لخدمات السيارات",
  description: "منصة SaaS متكاملة لإدارة مراكز خدمة السيارات",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthSessionProvider>
          <PwaProvider>{children}</PwaProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}

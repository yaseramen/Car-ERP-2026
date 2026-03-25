"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { getErrorMessage } from "@/lib/error-messages";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl");
  const callbackUrl = rawCallback && rawCallback.startsWith("/") && !rawCallback.startsWith("//") ? rawCallback : "/admin";
  const urlError = searchParams.get("error");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        setLoading(false);
        return;
      }

      if (result?.ok) {
        window.location.href = callbackUrl;
        return;
      }
    } catch (err) {
      setError(getErrorMessage(err, "حدث خطأ. حاول مرة أخرى."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">EFCT</h1>
        <p className="text-gray-500 mt-2">تسجيل الدخول</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {(error || urlError) && (
          <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
            {error || (urlError === "Configuration" ? "خطأ في إعدادات الخادم. تأكد من إضافة AUTH_SECRET في Vercel." : "حدث خطأ. حاول مرة أخرى.")}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            البريد الإلكتروني
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            placeholder="example@email.com"
            dir="ltr"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            كلمة المرور
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium rounded-lg transition-colors"
        >
          {loading ? "جاري التحقق..." : "تسجيل الدخول"}
        </button>

        <p className="text-center text-sm text-gray-500 mt-4">
          ليس لديك حساب؟{" "}
          <Link href="/register" className="text-emerald-600 hover:underline">
            تسجيل شركة جديدة
          </Link>
        </p>
        <p className="text-center text-sm text-gray-500 mt-2">
          نسيت كلمة المرور (مالك شركة)؟{" "}
          <Link href="/reset-password" className="text-emerald-600 hover:underline">
            استعادة عبر كود
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md mx-auto p-8 bg-white rounded-2xl shadow-lg animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-6" />
        <div className="h-12 bg-gray-200 rounded mb-4" />
        <div className="h-12 bg-gray-200 rounded" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

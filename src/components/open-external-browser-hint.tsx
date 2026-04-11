"use client";

import { useCallback, useState } from "react";

/** نسخ الرابط لفتح الموقع في Chrome/Safari بدل تطبيق فيسبوك/إنستغرام */
export function OpenExternalBrowserHint() {
  const [copied, setCopied] = useState(false);

  const copyUrl = useCallback(() => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (!url) return;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);
    });
  }, []);

  return (
    <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 p-4 text-sm text-amber-950 dark:text-amber-100 text-start space-y-3">
      <p className="font-medium">فتح من فيسبوك أو إنستغرام؟</p>
      <p className="text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
        انسخ الرابط ثم الصقه في <strong>Chrome</strong> أو <strong>Safari</strong> من الشاشة الرئيسية للهاتف — يعمل التطبيق بشكل أفضل خارج المتصفح المدمج.
      </p>
      <button
        type="button"
        onClick={copyUrl}
        className="w-full sm:w-auto px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors"
      >
        {copied ? "تم نسخ الرابط ✓" : "نسخ رابط هذه الصفحة"}
      </button>
    </div>
  );
}

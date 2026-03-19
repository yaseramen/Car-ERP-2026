"use client";

import { useState, useEffect } from "react";
import { processQueue, executeQueuedOpDefault } from "@/lib/offline-queue";

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = async () => {
      const { processed, failed } = await processQueue(executeQueuedOpDefault);
      if (processed > 0) {
        const msg = failed > 0
          ? `تم إرسال ${processed} عملية. فشل ${failed} عملية.`
          : `تم إرسال ${processed} عملية معلقة بنجاح.`;
        setTimeout(() => alert(msg), 300);
      }
      setIsOnline(true);
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 5000);
      window.dispatchEvent(new CustomEvent("alameen-online"));
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <>
      {children}
      {showBanner && (
        <div
          className={`fixed bottom-4 left-4 right-4 z-[100] rounded-lg px-4 py-3 shadow-lg flex items-center justify-between gap-4 ${
            isOnline
              ? "bg-emerald-600 text-white"
              : "bg-amber-600 text-white"
          }`}
          role="alert"
        >
          {isOnline ? (
            <>
              <span>✓ تم استعادة الاتصال. جاري تحديث البيانات...</span>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm font-medium"
              >
                تحديث الآن
              </button>
            </>
          ) : (
            <>
              <span>⚠ أنت غير متصل بالإنترنت. يتم عرض آخر البيانات المحفوظة. سيتم المزامنة عند عودة الاتصال.</span>
              <button
                onClick={() => setShowBanner(false)}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm"
              >
                إخفاء
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

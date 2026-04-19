"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function parseIdleMinutes(): number {
  if (typeof window === "undefined") return 15;
  const raw = process.env.NEXT_PUBLIC_IDLE_LOCK_MINUTES;
  if (raw === "0" || raw?.trim() === "") return 0;
  const n = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n < 1) return 15;
  return Math.min(240, n);
}

/**
 * قفل شاشة داخل لوحة التحكم بعد عدم تفاعل (افتراضي 15 دقيقة).
 * يُوقَظ بالنقر على «متابعة» أو Enter/Space. لا يغيّر انتهاء جلسة الخادم (JWT).
 */
export function AdminIdleLock() {
  const [locked, setLocked] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const lockedRef = useRef(false);

  const idleMs = parseIdleMinutes() * 60 * 1000;
  const enabled = idleMs > 0;

  const touch = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  /** عند العودة من تبويب آخر لا نُقفل فوراً بسبب ثبات lastActivity أثناء الإخفاء */
  useEffect(() => {
    if (!enabled) return;
    const onVis = () => {
      if (document.visibilityState === "visible" && !lockedRef.current) touch();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [enabled, touch]);

  const unlock = useCallback(() => {
    lastActivityRef.current = Date.now();
    lockedRef.current = false;
    setLocked(false);
  }, []);

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  useEffect(() => {
    if (!enabled) return;

    const onActivity = () => {
      if (lockedRef.current) return;
      lastActivityRef.current = Date.now();
    };

    const opts: AddEventListenerOptions = { capture: true, passive: true };
    const events: (keyof DocumentEventMap)[] = ["pointerdown", "keydown", "touchstart", "wheel"];
    for (const ev of events) {
      document.addEventListener(ev, onActivity, opts);
    }

    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (lockedRef.current) return;
      if (Date.now() - lastActivityRef.current >= idleMs) {
        lockedRef.current = true;
        setLocked(true);
      }
    }, 5000);

    return () => {
      window.clearInterval(id);
      for (const ev of events) {
        document.removeEventListener(ev, onActivity, opts);
      }
    };
  }, [enabled, idleMs]);

  useEffect(() => {
    if (!locked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        unlock();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked, unlock]);

  if (!enabled || !locked) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gray-950/85 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-lock-title"
    >
      <div className="max-w-md w-full rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl p-8 text-center">
        <p id="idle-lock-title" className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          البرنامج في وضع الخمول
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          لم يُرصد نشاط لمدة {Math.round(idleMs / 60000)} دقيقة. اضغط للمتابعة بأمان.
        </p>
        <button
          type="button"
          onClick={unlock}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          متابعة العمل
        </button>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">يمكنك أيضاً الضغط على Enter أو المسافة</p>
      </div>
    </div>
  );
}

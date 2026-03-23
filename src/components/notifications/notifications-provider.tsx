"use client";

import { createContext, useContext, useEffect, useRef, useCallback, useState } from "react";

type Summary = {
  lowStockCount: number;
  pendingInvoices: { count: number; remaining: number };
};

type NotificationsContextType = {
  requestPermission: () => Promise<NotificationPermission>;
  permission: NotificationPermission | null;
};

const NotificationsContext = createContext<NotificationsContextType | null>(null);

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = "alameen-notifications-last";

function getLastNotified(): Summary {
  if (typeof window === "undefined") return { lowStockCount: 0, pendingInvoices: { count: 0, remaining: 0 } };
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return { lowStockCount: 0, pendingInvoices: { count: 0, remaining: 0 } };
    const parsed = JSON.parse(s) as Summary;
    return {
      lowStockCount: parsed.lowStockCount ?? 0,
      pendingInvoices: {
        count: parsed.pendingInvoices?.count ?? 0,
        remaining: parsed.pendingInvoices?.remaining ?? 0,
      },
    };
  } catch {
    return { lowStockCount: 0, pendingInvoices: { count: 0, remaining: 0 } };
  }
}

function setLastNotified(summary: Summary) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(summary));
  } catch {}
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [permission, setPermission] = useState<NotificationPermission | null>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : null
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkAndNotify = useCallback(async () => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    try {
      const res = await fetch("/api/admin/reports/summary");
      if (!res.ok) return;
      const data = await res.json();
      const summary: Summary = {
        lowStockCount: data.lowStockCount ?? 0,
        pendingInvoices: data.pendingInvoices ?? { count: 0, remaining: 0 },
      };
      const last = getLastNotified();

      const lowStockNew = summary.lowStockCount > 0 && summary.lowStockCount !== last.lowStockCount;
      const pendingNew = summary.pendingInvoices.count > 0 && summary.pendingInvoices.count !== last.pendingInvoices.count;

      if (lowStockNew || pendingNew) {
        const parts: string[] = [];
        if (summary.lowStockCount > 0) parts.push(`${summary.lowStockCount} صنف ناقص`);
        if (summary.pendingInvoices.count > 0) parts.push(`${summary.pendingInvoices.count} فاتورة معلقة`);
        if (parts.length > 0) {
          new Notification("تنبيهات EFCT", {
            body: parts.join(" • "),
            icon: "/icon.svg",
            tag: "alameen-alert",
          });
          setLastNotified(summary);
        }
      }
    } catch {}
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return "denied" as NotificationPermission;
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm === "granted") {
      checkAndNotify();
      if (!intervalRef.current) {
        intervalRef.current = setInterval(checkAndNotify, POLL_INTERVAL_MS);
      }
    }
    return perm;
  }, [checkAndNotify]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPermission(Notification.permission);
    if (Notification.permission === "granted") {
      checkAndNotify();
      intervalRef.current = setInterval(checkAndNotify, POLL_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [checkAndNotify]);

  return (
    <NotificationsContext.Provider value={{ requestPermission, permission }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  return ctx;
}

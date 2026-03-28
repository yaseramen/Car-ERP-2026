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
const RELEASE_SEEN_KEY = "alameen-release-notifs-seen";
const MAX_RELEASE_TOASTS = 5;

type ReleaseNotifPayload = { id: string; title: string; body: string; link?: string };

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

function getSeenReleaseIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const s = localStorage.getItem(RELEASE_SEEN_KEY);
    if (!s) return [];
    const parsed = JSON.parse(s) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function markReleaseSeen(ids: string[]) {
  if (typeof window === "undefined" || ids.length === 0) return;
  try {
    const prev = new Set(getSeenReleaseIds());
    ids.forEach((id) => prev.add(id));
    localStorage.setItem(RELEASE_SEEN_KEY, JSON.stringify([...prev]));
  } catch {}
}

function showReleaseNotifications(list: ReleaseNotifPayload[]) {
  if (!("Notification" in window) || Notification.permission !== "granted" || list.length === 0) return;
  const seen = new Set(getSeenReleaseIds());
  const unseen = list.filter((n) => n.id && !seen.has(n.id));
  if (unseen.length === 0) return;

  const toShow = unseen.slice(0, MAX_RELEASE_TOASTS);
  const ids = toShow.map((n) => n.id);

  toShow.forEach((n, i) => {
    window.setTimeout(() => {
      try {
        new Notification(`جديد في EFCT: ${n.title}`, {
          body: n.body.slice(0, 280) + (n.body.length > 280 ? "…" : ""),
          icon: "/icon.svg",
          tag: `efct-release-${n.id}`,
        });
      } catch {
        /* ignore */
      }
    }, i * 900);
  });

  window.setTimeout(() => markReleaseSeen(ids), toShow.length * 900 + 400);
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [permission, setPermission] = useState<NotificationPermission | null>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : null
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkAndNotify = useCallback(async () => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    try {
      const [summaryRes, releaseRes] = await Promise.all([
        fetch("/api/admin/reports/summary"),
        fetch("/api/admin/help/release-notifications"),
      ]);

      if (releaseRes.ok) {
        const rel = await releaseRes.json();
        const list = Array.isArray(rel.notifications) ? (rel.notifications as ReleaseNotifPayload[]) : [];
        showReleaseNotifications(list);
      }

      if (!summaryRes.ok) return;
      const data = await summaryRes.json();
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
    const t = window.setTimeout(() => {
      setPermission(Notification.permission);
      if (Notification.permission === "granted") {
        checkAndNotify();
        intervalRef.current = setInterval(checkAndNotify, POLL_INTERVAL_MS);
      }
    }, 0);
    return () => {
      window.clearTimeout(t);
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

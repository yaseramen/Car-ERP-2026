/**
 * طابور عمليات أوفلاين - يحفظ الطلبات عند انقطاع الإنترنت ويعيد إرسالها عند العودة
 */

const STORAGE_KEY = "alameen-offline-queue";

export type QueuedOp =
  | { type: "add_service"; orderId: string; data: { description: string; quantity: number; unit_price: number } }
  | { type: "add_part"; orderId: string; data: { item_id: string; quantity: number } };

export interface QueuedItem {
  id: string;
  op: QueuedOp;
  createdAt: string;
}

function loadQueue(): QueuedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(items: QueuedItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function addToQueue(op: QueuedOp): string {
  const items = loadQueue();
  const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  items.push({ id, op, createdAt: new Date().toISOString() });
  saveQueue(items);
  return id;
}

export function removeFromQueue(id: string) {
  const items = loadQueue().filter((i) => i.id !== id);
  saveQueue(items);
}

export function getQueue(): QueuedItem[] {
  return loadQueue();
}

export async function processQueue(
  executor: (item: QueuedItem) => Promise<boolean>
): Promise<{ processed: number; failed: number }> {
  const items = loadQueue();
  let processed = 0;
  let failed = 0;
  for (const item of items) {
    try {
      const ok = await executor(item);
      if (ok) {
        removeFromQueue(item.id);
        processed++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }
  return { processed, failed };
}

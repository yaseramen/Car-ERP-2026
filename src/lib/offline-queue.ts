/**
 * طابور عمليات أوفلاين - يحفظ الطلبات عند انقطاع الإنترنت ويعيد إرسالها عند العودة
 */

const STORAGE_KEY = "alameen-offline-queue";

export type QueuedOp =
  | { type: "add_service"; orderId: string; data: { description: string; quantity: number; unit_price: number } }
  | { type: "add_part"; orderId: string; data: { item_id: string; quantity: number } }
  | {
      type: "create_sale_invoice";
      data: {
        customer_id?: string;
        items: { item_id: string; quantity: number }[];
        payment_method_id?: string;
        paid_amount?: number;
        discount?: number;
        tax?: number;
        notes?: string;
      };
    }
  | {
      type: "create_purchase_invoice";
      data: {
        supplier_id?: string;
        items: { item_id: string; quantity: number; unit_price: number }[];
        notes?: string;
        discount?: number;
        tax?: number;
      };
    }
  | { type: "add_customer"; data: { name: string; phone?: string; email?: string; address?: string; notes?: string } }
  | { type: "add_supplier"; data: { name: string; phone?: string; email?: string } };

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

/** تنفيذ افتراضي لجميع أنواع العمليات - يُستخدم في OfflineProvider */
export async function executeQueuedOpDefault(item: QueuedItem): Promise<boolean> {
  const { op } = item;
  let url: string;
  let body: string;
  let method = "POST";

  switch (op.type) {
    case "add_service":
      url = `/api/admin/workshop/orders/${op.orderId}/services`;
      body = JSON.stringify(op.data);
      break;
    case "add_part":
      url = `/api/admin/workshop/orders/${op.orderId}/items`;
      body = JSON.stringify(op.data);
      break;
    case "create_sale_invoice":
      url = "/api/admin/invoices/sale";
      body = JSON.stringify(op.data);
      break;
    case "create_purchase_invoice":
      url = "/api/admin/invoices/purchase";
      body = JSON.stringify(op.data);
      break;
    case "add_customer":
      url = "/api/admin/customers";
      body = JSON.stringify(op.data);
      break;
    case "add_supplier":
      url = "/api/admin/suppliers";
      body = JSON.stringify(op.data);
      break;
    default:
      return false;
  }

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body,
  });
  return res.ok;
}

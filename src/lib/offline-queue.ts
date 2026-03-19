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
  | { type: "add_supplier"; data: { name: string; phone?: string; email?: string; address?: string; notes?: string } }
  | {
      type: "treasury_transaction";
      data: {
        type: "expense" | "income";
        treasury_id: string;
        amount: number;
        description?: string;
        payment_method_id?: string;
      };
    }
  | {
      type: "invoice_pay";
      invoiceId: string;
      data: { amount: number; payment_method_id: string; reference_number?: string; notes?: string };
    }
  | {
      type: "create_repair_order";
      data: {
        vehicle_plate: string;
        vehicle_model?: string;
        vehicle_year?: number;
        mileage?: number;
        customer_id?: string;
        order_type?: "maintenance" | "inspection";
      };
    }
  | {
      type: "update_repair_order_stage";
      orderId: string;
      data: { stage: string; inspection_notes?: string };
    }
  | {
      type: "treasury_transfer";
      data: { from_id: string; to_id: string; amount: number; description?: string };
    }
  | { type: "invoice_cancel"; invoiceId: string }
  | { type: "invoice_return"; invoiceId: string }
  | {
      type: "invoice_return_partial";
      invoiceId: string;
      data: { items: { item_id: string; quantity: number }[] };
    }
  | {
      type: "treasury_settle";
      data: { from_date?: string; to_date?: string; note?: string };
    }
  | {
      type: "save_inspection_checklist";
      orderId: string;
      data: {
        results: { checklist_item_id: string; status: string; notes: string }[];
        general_notes: string;
      };
    }
  | {
      type: "inventory_item_patch";
      itemId: string;
      data: { category?: string | null; min_quantity?: number; min_quantity_enabled?: boolean };
    };

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
    case "treasury_transaction":
      url = "/api/admin/treasuries/transaction";
      body = JSON.stringify(op.data);
      break;
    case "invoice_pay":
      url = `/api/admin/invoices/${op.invoiceId}/pay`;
      body = JSON.stringify(op.data);
      break;
    case "create_repair_order":
      url = "/api/admin/workshop/orders";
      body = JSON.stringify(op.data);
      break;
    case "update_repair_order_stage":
      url = `/api/admin/workshop/orders/${op.orderId}`;
      body = JSON.stringify(op.data);
      method = "PATCH";
      break;
    case "treasury_transfer":
      url = "/api/admin/treasuries/transfer";
      body = JSON.stringify(op.data);
      break;
    case "invoice_cancel":
      url = `/api/admin/invoices/${op.invoiceId}/cancel`;
      body = "{}";
      break;
    case "invoice_return":
      url = `/api/admin/invoices/${op.invoiceId}/return`;
      body = "{}";
      break;
    case "invoice_return_partial":
      url = `/api/admin/invoices/${op.invoiceId}/return-partial`;
      body = JSON.stringify(op.data);
      break;
    case "treasury_settle":
      url = "/api/admin/treasuries/settle";
      body = JSON.stringify(op.data);
      break;
    case "save_inspection_checklist":
      url = `/api/admin/workshop/orders/${op.orderId}/inspection-results`;
      body = JSON.stringify(op.data);
      method = "PUT";
      break;
    case "inventory_item_patch":
      url = `/api/admin/inventory/items/${op.itemId}`;
      body = JSON.stringify(op.data);
      method = "PATCH";
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

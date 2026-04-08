/**
 * تفضيل طباعة سطر «بيان أعمال وليس فاتورة» — localStorage فقط؛ لا يؤثر على منطق الفاتورة.
 */
export const INVOICE_PRINT_DISCLAIMER_STORAGE_KEY = "efct-invoice-print-disclaimer-v1";

export type InvoicePrintDisclaimerPrefs = {
  enabled: boolean;
};

export function defaultInvoicePrintDisclaimerPrefs(): InvoicePrintDisclaimerPrefs {
  return { enabled: false };
}

export function loadInvoicePrintDisclaimerPrefs(): InvoicePrintDisclaimerPrefs {
  if (typeof window === "undefined") return defaultInvoicePrintDisclaimerPrefs();
  try {
    const raw = localStorage.getItem(INVOICE_PRINT_DISCLAIMER_STORAGE_KEY);
    if (!raw) return defaultInvoicePrintDisclaimerPrefs();
    const p = JSON.parse(raw) as { enabled?: boolean; variant?: string };
    if (typeof p.enabled === "boolean") {
      return { enabled: p.enabled };
    }
    // ترحيل من إصدار سابق (variant)
    if (p.variant === "invoice") return { enabled: false };
    if (p.variant === "statement") return { enabled: true };
    return defaultInvoicePrintDisclaimerPrefs();
  } catch {
    return defaultInvoicePrintDisclaimerPrefs();
  }
}

export function saveInvoicePrintDisclaimerPrefs(p: InvoicePrintDisclaimerPrefs) {
  try {
    localStorage.setItem(INVOICE_PRINT_DISCLAIMER_STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/** النص الذي يظهر في الطباعة عند التفعيل */
export const INVOICE_PRINT_DISCLAIMER_LINE_AR = "بيان أعمال وليس فاتورة.";

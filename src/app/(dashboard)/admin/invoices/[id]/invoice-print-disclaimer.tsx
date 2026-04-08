"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "efct-invoice-print-disclaimer-v1";

type DisclaimerState = {
  enabled: boolean;
  /** statement = بيان أعمال وليس فاتورة ضريبية؛ invoice = تأكيد أنه فاتورة */
  variant: "statement" | "invoice";
};

function defaultState(): DisclaimerState {
  return { enabled: true, variant: "statement" };
}

function loadState(): DisclaimerState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const p = JSON.parse(raw) as Partial<DisclaimerState>;
    return {
      enabled: typeof p.enabled === "boolean" ? p.enabled : defaultState().enabled,
      variant: p.variant === "invoice" ? "invoice" : "statement",
    };
  } catch {
    return defaultState();
  }
}

function saveState(s: DisclaimerState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

const TYPE_LABELS: Record<string, string> = {
  sale: "بيع",
  maintenance: "صيانة",
};

type Props = {
  invoiceType: string;
};

export function InvoicePrintDisclaimer({ invoiceType }: Props) {
  const [state, setState] = useState<DisclaimerState>(defaultState);

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const setEnabled = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, enabled }));
  }, []);

  const setVariant = useCallback((variant: DisclaimerState["variant"]) => {
    setState((prev) => ({ ...prev, variant }));
  }, []);

  if (invoiceType !== "sale" && invoiceType !== "maintenance") {
    return null;
  }

  const typeLabel = TYPE_LABELS[invoiceType] || invoiceType;

  return (
    <>
      <div className="no-print mb-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
        <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">سطر توضيحي أسفل الفاتورة (الطباعة وPDF)</p>
        <label className="flex items-center gap-2 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={state.enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>إظهار السطر في الطباعة والتحميل</span>
        </label>
        <fieldset disabled={!state.enabled} className="space-y-2 border-0 p-0 m-0">
          <legend className="text-xs text-gray-500 dark:text-gray-400 mb-1">نوع التوضيح</legend>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="invoice-disclaimer-variant"
              checked={state.variant === "statement"}
              onChange={() => setVariant("statement")}
              className="mt-1 border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>
              <strong className="font-medium">بيان أعمال فقط</strong>
              <span className="block text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                يوضح أن المستند ليس فاتورة ضريبية رسمية.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="invoice-disclaimer-variant"
              checked={state.variant === "invoice"}
              onChange={() => setVariant("invoice")}
              className="mt-1 border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>
              <strong className="font-medium">فاتورة / مستند مطالبة</strong>
              <span className="block text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                يؤكد أن المستند يُعد فاتورة {typeLabel} مسجّلة في النظام.
              </span>
            </span>
          </label>
        </fieldset>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          يُحفظ اختيارك تلقائياً ويُطبَّق كافتراضي عند فتح فواتير البيع أو الصيانة التالية.
        </p>
      </div>

      {state.enabled && (
        <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-300 dark:border-gray-600 invoice-print-disclaimer text-center text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed px-2">
          {state.variant === "statement" ? (
            <p className="m-0 font-medium">
              تنبيه: هذا المستند <strong>بيان أعمال أو تفاصيل خدمة</strong> فقط، و<strong>لا يُعتدّ به كفاتورة ضريبية رسمية</strong> ما لم
              يُصدر لكم مستند ضريبي معتمد منفصل.
            </p>
          ) : (
            <p className="m-0 font-medium">
              هذا المستند يُعد <strong>فاتورة {typeLabel}</strong> مسجّلة في النظام، ويُستخدم كمرجع للمطالبة والمحاسبة حسب سياسة المنشأة.
            </p>
          )}
        </div>
      )}
    </>
  );
}

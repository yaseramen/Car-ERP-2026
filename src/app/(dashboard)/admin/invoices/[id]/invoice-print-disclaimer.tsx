"use client";

import { useCallback, useEffect, useState } from "react";
import {
  defaultInvoicePrintDisclaimerPrefs,
  INVOICE_PRINT_DISCLAIMER_LINE_AR,
  loadInvoicePrintDisclaimerPrefs,
  saveInvoicePrintDisclaimerPrefs,
} from "@/lib/invoice-print-disclaimer-prefs";

type Props = {
  invoiceType: string;
};

export function InvoicePrintDisclaimer({ invoiceType }: Props) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(loadInvoicePrintDisclaimerPrefs().enabled);
  }, []);

  useEffect(() => {
    saveInvoicePrintDisclaimerPrefs({ enabled });
  }, [enabled]);

  const toggle = useCallback((v: boolean) => {
    setEnabled(v);
  }, []);

  if (invoiceType !== "sale" && invoiceType !== "maintenance") {
    return null;
  }

  return (
    <>
      <div className="no-print mb-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
        <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">سطر على المطبوع للعميل فقط</p>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => toggle(e.target.checked)}
            className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>
            <span className="font-medium">إظهار «{INVOICE_PRINT_DISCLAIMER_LINE_AR}» في الطباعة وPDF</span>
            <span className="block text-xs text-gray-600 dark:text-gray-400 mt-1">
              لا يغيّر حسابات الفاتورة أو المخزون أو الخدمة الرقمية — للعرض على الورق فقط. يُحفظ اختيارك لهذا الجهاز.
            </span>
          </span>
        </label>
      </div>

      {enabled && (
        <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-300 dark:border-gray-600 invoice-print-disclaimer text-center text-sm text-gray-800 dark:text-gray-200 font-medium px-2">
          <p className="m-0">{INVOICE_PRINT_DISCLAIMER_LINE_AR}</p>
        </div>
      )}
    </>
  );
}

"use client";

import { useCallback } from "react";

type InvoiceActionsProps = {
  invoiceNumber: string;
  invoiceType: string;
  total: number;
};

const TYPE_LABELS: Record<string, string> = {
  sale: "بيع",
  purchase: "شراء",
  maintenance: "صيانة",
};

export function InvoiceActions({ invoiceNumber, invoiceType, total }: InvoiceActionsProps) {
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    const el = document.getElementById("invoice-print-area");
    if (!el) return;

    const noPrint = el.querySelectorAll(".no-print");
    noPrint.forEach((n) => ((n as HTMLElement).style.visibility = "hidden"));

    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: 10,
          filename: `فاتورة-${invoiceNumber}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(el)
        .save();
    } finally {
      noPrint.forEach((n) => ((n as HTMLElement).style.visibility = ""));
    }
  }, [invoiceNumber]);

  const handleShareWhatsApp = useCallback(() => {
    const typeLabel = TYPE_LABELS[invoiceType] || invoiceType;
    const text = `فاتورة ${typeLabel} رقم ${invoiceNumber}\nالإجمالي: ${total.toFixed(2)} ج.م`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [invoiceNumber, invoiceType, total]);

  return (
    <div className="flex flex-wrap gap-2 no-print">
      <button
        type="button"
        onClick={handlePrint}
        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
      >
        طباعة
      </button>
      <button
        type="button"
        onClick={handleDownloadPdf}
        className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-medium rounded-lg transition-colors"
      >
        تحميل PDF
      </button>
      <button
        type="button"
        onClick={handleShareWhatsApp}
        className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-800 font-medium rounded-lg transition-colors flex items-center gap-2"
      >
        <span>إرسال واتساب</span>
      </button>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

interface BarcodeLabelPrintProps {
  barcode: string;
  itemName: string;
  onClose: () => void;
}

export function BarcodeLabelPrint({ barcode, itemName, onClose }: BarcodeLabelPrintProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!barcode?.trim()) return;
    let mounted = true;
    (async () => {
      await new Promise((r) => setTimeout(r, 50));
      if (!mounted || !svgRef.current) return;
      try {
        const JsBarcode = (await import("jsbarcode")).default;
        JsBarcode(svgRef.current, barcode.trim(), {
          format: "CODE128",
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14,
          margin: 5,
        });
        if (mounted) setReady(true);
      } catch (e) {
        console.error("JsBarcode error:", e);
      }
    })();
    return () => { mounted = false; };
  }, [barcode]);

  const handlePrint = () => {
    const content = containerRef.current;
    if (!content) return;
    const svgEl = content.querySelector("svg");
    const svgHtml = svgEl ? svgEl.outerHTML : "";
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("يُرجى السماح بالنوافذ المنبثقة لطباعة الملصق.");
      return;
    }
    const escapedName = itemName
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>ملصق باركود - ${escapedName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 10mm; }
            .label { border: 1px solid #ddd; padding: 8mm; width: 50mm; text-align: center; }
            .label-name { font-size: 10px; margin-bottom: 4px; word-break: break-all; }
            .label svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }
            .label-code { font-size: 9px; margin-top: 4px; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="label-name">${escapedName}</div>
            ${svgHtml}
            <div class="label-code">${barcode}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" dir="rtl">
      <div ref={containerRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">طباعة ملصق الباركود</h3>
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-900 text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 break-words">{itemName}</p>
          <svg ref={svgRef} className="max-w-full h-auto" />
          <p className="text-xs font-mono text-gray-500 dark:text-gray-500 mt-2">{barcode}</p>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          يمكنك لصق هذا الملصق على الصنف ومسحه بالكاميرا أو الماسح الضوئي عند البيع.
        </p>
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium"
          >
            إغلاق
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
          >
            طباعة
          </button>
        </div>
      </div>
    </div>
  );
}

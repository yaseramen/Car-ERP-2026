"use client";

import { useEffect, useRef, useState } from "react";

interface BarcodeLabelPrintProps {
  barcode: string;
  itemName: string;
  /** سعر البيع يظهر على الملصق عند الطباعة */
  salePrice?: number | null;
  onClose: () => void;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function BarcodeLabelPrint({ barcode, itemName, salePrice, onClose }: BarcodeLabelPrintProps) {
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
          width: 1.8,
          height: 48,
          displayValue: true,
          fontSize: 11,
          margin: 4,
          textMargin: 2,
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
    const escapedName = escapeHtml(itemName || "صنف");
    const priceLine =
      salePrice != null && Number.isFinite(salePrice)
        ? `<div class="label-price">${escapeHtml(Number(salePrice).toFixed(2))} ج.م</div>`
        : "";
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
          <meta charset="utf-8">
          <title>ملصق باركود - ${escapedName}</title>
          <style>
            /* ملصق شائع 40×30 مم — اختر نفس المقاس في نافذة الطباعة (حجم ورق مخصص) */
            @page { size: 40mm 30mm; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              width: 40mm;
              height: 30mm;
              margin: 0;
              padding: 0;
              font-family: Arial, "Segoe UI", Tahoma, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .label {
              width: 40mm;
              height: 30mm;
              padding: 1.5mm 2mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              overflow: hidden;
            }
            .label-name {
              font-size: 7px;
              line-height: 1.15;
              max-height: 2.6em;
              overflow: hidden;
              word-break: break-word;
              width: 100%;
            }
            .label-price {
              font-size: 9px;
              font-weight: bold;
              margin: 0.5mm 0 1mm;
            }
            .label svg {
              max-width: 100%;
              height: auto;
              display: block;
            }
            .label-code {
              font-size: 7px;
              margin-top: 0.5mm;
              font-family: ui-monospace, monospace;
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="label-name">${escapedName}</div>
            ${priceLine}
            ${svgHtml}
            <div class="label-code">${escapeHtml(barcode.trim())}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" dir="rtl">
      <div ref={containerRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">طباعة ملصق الباركود</h3>
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-900 text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 break-words">{itemName}</p>
          {salePrice != null && Number.isFinite(salePrice) && (
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-2">
              {Number(salePrice).toFixed(2)} ج.م
            </p>
          )}
          <svg ref={svgRef} className="max-w-full h-auto" />
          <p className="text-xs font-mono text-gray-500 dark:text-gray-500 mt-2">{barcode}</p>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          يمكنك لصق هذا الملصق على الصنف ومسحه بالكاميرا أو الماسح الضوئي عند البيع.
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-2 leading-relaxed">
          إذا ظهرت الطباعة في أعلى أو أسفل الملصق: اختر في نافذة الطباعة نفس <strong>مقاس الملصق</strong> (مثل 40×30 مم) أو اضبط الهوامش من إعدادات الطابعة الحرارية.
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

"use client";

import { useEffect, useRef, useState, useMemo } from "react";

const STORAGE_KEY = "efct-barcode-label-preset";

/** مقاسات شائعة + ما يقابلها في نافذة Chrome (مثل 2 x 4) */
export const LABEL_PRESETS = [
  {
    id: "40x30mm",
    label: "40 × 30 مم",
    pageCss: "40mm 30mm",
    wMm: 40,
    hMm: 30,
    chromeHint: "حجم مخصص: 40×30 مم أو أقرب مقاس من الطابعة",
  },
  {
    id: "50x30mm",
    label: "50 × 30 مم",
    pageCss: "50mm 30mm",
    wMm: 50,
    hMm: 30,
    chromeHint: "حجم مخصص أو رول 50 مم",
  },
  {
    id: "58x40mm",
    label: "58 × 40 مم (رول 58)",
    pageCss: "58mm 40mm",
    wMm: 58,
    hMm: 40,
    chromeHint: "مناسب لرول عرض 58 مم",
  },
  {
    id: "80x50mm",
    label: "80 × 50 مم",
    pageCss: "80mm 50mm",
    wMm: 80,
    hMm: 50,
    chromeHint: "حجم مخصص 80×50 مم",
  },
  {
    id: "200x300mm",
    label: "200 × 300 مم (A4 ربع / ملصق كبير)",
    pageCss: "200mm 300mm",
    wMm: 200,
    hMm: 300,
    chromeHint: "حجم مخصص 200×300 مم في إعدادات الطابعة إن لم يكن في القائمة؛ قد تحتاج تقليل الهوامش.",
  },
  {
    id: "2x3in",
    label: "2 × 3 بوصة (طابعة حرارية)",
    pageCss: "2in 3in",
    wMm: 50.8,
    hMm: 76.2,
    chromeHint: "يطابق «2 x 3» في حجم الورق؛ أو حجم مخصص 2×3 بوصة (عرض×ارتفاع).",
  },
  {
    id: "2x4in",
    label: "2 × 4 بوصة (4×2) — كما في Chrome",
    pageCss: "4in 2in",
    wMm: 101.6,
    hMm: 50.8,
    chromeHint: "في Chrome اختر حجم الورق: «2 x 4» (4×2 بوصة) — يطابق هذا الخيار.",
  },
  {
    id: "2x4in_portrait",
    label: "2 × 4 بوصة (عمودي 2×4)",
    pageCss: "2in 4in",
    wMm: 50.8,
    hMm: 101.6,
    chromeHint: "إذا كان ملصقك طويلاً: جرّب 2 x 4 عمودي في إعدادات الطابعة",
  },
] as const;

export type LabelPresetId = (typeof LABEL_PRESETS)[number]["id"];

function getPreset(id: string) {
  return LABEL_PRESETS.find((p) => p.id === id) ?? LABEL_PRESETS[0];
}

interface BarcodeLabelPrintProps {
  barcode: string;
  itemName: string;
  salePrice?: number | null;
  onClose: () => void;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function BarcodeLabelPrint({ barcode, itemName, salePrice, onClose }: BarcodeLabelPrintProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [presetId, setPresetId] = useState<LabelPresetId>(() => {
    if (typeof window === "undefined") return LABEL_PRESETS[0].id;
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s && LABEL_PRESETS.some((p) => p.id === s)) return s as LabelPresetId;
    } catch {}
    return LABEL_PRESETS[0].id;
  });

  const preset = useMemo(() => getPreset(presetId), [presetId]);

  const barcodeOpts = useMemo(() => {
    const shortSide = Math.min(preset.wMm, preset.hMm);
    const barHeight = Math.round(Math.min(70, Math.max(28, shortSide * 1.1)));
    const barWidth = Math.min(2.2, Math.max(1.2, shortSide / 28));
    const fontSize = Math.min(14, Math.max(8, shortSide / 3.5));
    return { height: barHeight, width: barWidth, fontSize };
  }, [preset]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, presetId);
    } catch {}
  }, [presetId]);

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
          width: barcodeOpts.width,
          height: barcodeOpts.height,
          displayValue: true,
          fontSize: barcodeOpts.fontSize,
          margin: 4,
          textMargin: 2,
        });
      } catch (e) {
        console.error("JsBarcode error:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [barcode, barcodeOpts]);

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

    const nameFont = Math.min(9, Math.max(5, preset.hMm / 5));
    const priceFont = Math.min(11, Math.max(7, preset.hMm / 4.5));
    const codeFont = Math.min(8, Math.max(5, preset.hMm / 5.5));

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
          <meta charset="utf-8">
          <title>ملصق باركود - ${escapedName}</title>
          <style>
            @page { size: ${preset.pageCss}; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              width: 100%;
              height: 100%;
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
              width: 100%;
              height: 100%;
              max-width: 100vw;
              max-height: 100vh;
              padding: 1mm 1.5mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              overflow: hidden;
            }
            .label-name {
              font-size: ${nameFont}px;
              line-height: 1.15;
              max-height: 3em;
              overflow: hidden;
              word-break: break-word;
              width: 100%;
            }
            .label-price {
              font-size: ${priceFont}px;
              font-weight: bold;
              margin: 0.3mm 0 0.8mm;
            }
            .label svg {
              max-width: 100%;
              width: 100%;
              height: auto;
              max-height: 42%;
              display: block;
              flex-shrink: 1;
            }
            .label-code {
              font-size: ${codeFont}px;
              margin-top: 0.4mm;
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
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" dir="rtl">
      <div ref={containerRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">طباعة ملصق الباركود</h3>

        <div className="mb-4">
          <label htmlFor="label-preset" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            مقاس الملصق / الورق
          </label>
          <select
            id="label-preset"
            value={presetId}
            onChange={(e) => setPresetId(e.target.value as LabelPresetId)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          >
            {LABEL_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{preset.chromeHint}</p>
          <p className="text-xs text-amber-800 dark:text-amber-200 mt-2">
            في Chrome: عطّل «رأس وتذييل الصفحة»، واضبط الهوامش على «لا شيء» أو «الحد الأدنى» إن وُجد، واختر نفس المقاس أعلاه من «حجم الورق».
          </p>
        </div>

        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-900 text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 break-words">{itemName}</p>
          {salePrice != null && Number.isFinite(salePrice) && (
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-2">
              {Number(salePrice).toFixed(2)} ج.م
            </p>
          )}
          <div className="flex justify-center overflow-hidden max-h-40">
            <svg ref={svgRef} className="max-w-full h-auto" />
          </div>
          <p className="text-xs font-mono text-gray-500 dark:text-gray-500 mt-2">{barcode}</p>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          يُحفظ اختيار المقاس على هذا الجهاز للمرة القادمة.
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

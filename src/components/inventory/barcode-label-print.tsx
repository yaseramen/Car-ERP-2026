"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { expiryUiStatus, formatExpiryArLabel } from "@/lib/item-expiry";

const STORAGE_KEY = "efct-barcode-label-preset";

/** مقاسات شائعة + ما يقابلها في نافذة Chrome (مثل 2 x 4) */
export const LABEL_PRESETS = [
  {
    id: "20x30mm",
    label: "20 × 30 مم (ملصق صغير)",
    pageCss: "20mm 30mm",
    wMm: 20,
    hMm: 30,
    chromeHint:
      "مهم: في نافذة الطباعة عطّل «رأس وتذييل الصفحة» حتى لا يظهر التاريخ أو عنوان الصفحة. اختر حجم ورق 20×30 مم أو مخصص بنفس القياس.",
  },
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
    id: "52x25mm",
    label: "52 × 25 مم (كثير من تست الطابعة)",
    pageCss: "52mm 25mm",
    wMm: 52,
    hMm: 25,
    chromeHint:
      "إذا كان تست الطابعة يعرض SIZE: 52×25 مم — اختر هذا الخيار وفي ويندوز عيّن نفس الحجم المخصص للورق.",
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
  /** إن وُجد تاريخ صلاحية يُعرض سطراً قصيراً على الملصق */
  hasExpiry?: boolean;
  expiryDate?: string | null;
  onClose: () => void;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Rasterize the JsBarcode SVG to PNG so thermal drivers get bitmap bars
 * (many ESC/POS stacks mishandle SVG scaling). Falls back to null on failure.
 */
function svgBarcodeToPngDataUrl(svg: SVGSVGElement): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const xml = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
      const objectUrl = URL.createObjectURL(blob);
      const img = new Image();
      const revoke = () => {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          /* ignore */
        }
      };

      const resolveDims = (): { w: number; h: number } => {
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        if (nw > 0 && nh > 0) return { w: nw, h: nh };
        try {
          const b = svg.getBBox();
          const w = Math.max(1, Math.ceil(b.width));
          const h = Math.max(1, Math.ceil(b.height));
          return { w, h };
        } catch {
          const r = svg.getBoundingClientRect();
          return {
            w: Math.max(1, Math.round(r.width) || 200),
            h: Math.max(1, Math.round(r.height) || 60),
          };
        }
      };

      img.onload = () => {
        const { w, h } = resolveDims();
        const scale = 4;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          revoke();
          resolve(null);
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        try {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        } catch {
          revoke();
          resolve(null);
          return;
        }
        revoke();
        try {
          resolve(canvas.toDataURL("image/png"));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => {
        revoke();
        resolve(null);
      };
      img.src = objectUrl;
    } catch {
      resolve(null);
    }
  });
}

function expiryLineForLabel(hasExpiry?: boolean, expiryDate?: string | null): string | null {
  if (!hasExpiry || !expiryDate?.trim()) return null;
  const st = expiryUiStatus(true, expiryDate);
  const lbl = formatExpiryArLabel(st, expiryDate);
  if (!lbl) return null;
  const d = expiryDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  }
  return lbl;
}

export function BarcodeLabelPrint({
  barcode,
  itemName,
  salePrice,
  hasExpiry,
  expiryDate,
  onClose,
}: BarcodeLabelPrintProps) {
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

  const expiryShort = useMemo(() => expiryLineForLabel(hasExpiry, expiryDate), [hasExpiry, expiryDate]);

  const barcodeOpts = useMemo(() => {
    const shortSide = Math.min(preset.wMm, preset.hMm);
    const isTiny = preset.wMm <= 22 && preset.hMm <= 35;
    const isSmall = shortSide < 45;
    const barHeight = isTiny
      ? Math.max(11, Math.min(16, Math.round(preset.hMm * 1.9)))
      : isSmall
        ? Math.max(22, Math.min(40, Math.round(shortSide * 2.2)))
        : Math.round(Math.min(70, Math.max(28, shortSide * 1.1)));
    const barWidth = isTiny ? 1 : Math.min(2.2, Math.max(1.2, shortSide / 28));
    const fontSize = isTiny ? 0 : Math.min(14, Math.max(8, shortSide / 3.5));
    const showTextUnderBars = !isTiny && preset.hMm >= 38;
    return { height: barHeight, width: barWidth, fontSize, showTextUnderBars };
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
          displayValue: barcodeOpts.showTextUnderBars,
          fontSize: barcodeOpts.fontSize || 8,
          margin: barcodeOpts.showTextUnderBars ? 2 : 0,
          textMargin: barcodeOpts.showTextUnderBars ? 2 : 0,
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
    const hintKey = "efct-print-headers-dismissed";
    try {
      if (localStorage.getItem(hintKey) !== "1") {
        const ok = window.confirm(
          "مهم: في نافذة الطباعة عطّل «رأس وتذييل الصفحة» (Headers and footers).\n\nوإلا يظهر التاريخ والرابط (مثل car.../admin) على الملصق — هذا من المتصفح وليس من البرنامج.\n\nاضغط موافق للمتابعة."
        );
        if (!ok) return;
        localStorage.setItem(hintKey, "1");
      }
    } catch {
      /* ignore */
    }
    void (async () => {
      const content = containerRef.current;
      if (!content) return;
      const svgEl = content.querySelector("svg");
      let barcodeBlock = "";
      if (svgEl instanceof SVGSVGElement) {
        const png = await svgBarcodeToPngDataUrl(svgEl);
        if (png) {
          barcodeBlock = `<div class="label-barcode"><img src="${png}" alt="" /></div>`;
        } else {
          barcodeBlock = `<div class="label-barcode-svg">${svgEl.outerHTML}</div>`;
        }
      }
      const escapedName = escapeHtml((itemName || "صنف").trim());
      const priceLine =
        salePrice != null && Number.isFinite(salePrice)
          ? `<div class="label-price">${escapeHtml(Number(salePrice).toFixed(2))} ج.م</div>`
          : "";

      const expLine =
        expiryShort != null
          ? `<div class="label-expiry">${escapeHtml(expiryShort)}</div>`
          : "";

      const isTiny = preset.wMm <= 22 && preset.hMm <= 35;
      const nameFont = isTiny ? 4.5 : Math.min(9, Math.max(5, preset.hMm / 5));
      const priceFont = isTiny ? 5.5 : Math.min(11, Math.max(7, preset.hMm / 4.5));
      const expiryFont = isTiny ? 4 : Math.min(8, Math.max(5, preset.hMm / 6));

      const w = preset.pageCss.split(/\s+/)[0];
      const h = preset.pageCss.split(/\s+/)[1] ?? preset.pageCss.split(/\s+/)[0];

      const html = `<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="utf-8">
  <title>ملصق</title>
  <style>
    @page { size: ${preset.pageCss}; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: ${w};
      height: ${h};
      max-width: ${w};
      max-height: ${h};
      margin: 0;
      padding: 0;
      overflow: hidden;
      font-family: Arial, "Segoe UI", Tahoma, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    body {
      display: flex;
      align-items: stretch;
      justify-content: stretch;
    }
    .label {
      width: ${w};
      height: ${h};
      max-width: ${w};
      max-height: ${h};
      padding: ${isTiny ? "0.25mm 0.4mm" : "0.8mm 1mm"};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: ${isTiny ? "0.15mm" : "0.35mm"};
      text-align: center;
      overflow: hidden;
    }
    .label-name {
      font-size: ${nameFont}px;
      line-height: 1.05;
      max-height: 2.1em;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
      width: 100%;
      flex-shrink: 0;
    }
    .label-price {
      font-size: ${priceFont}px;
      font-weight: bold;
      margin: ${isTiny ? "0.1mm 0 0.1mm" : "0.2mm 0 0.3mm"};
      flex-shrink: 0;
      line-height: 1;
    }
    .label-expiry {
      font-size: ${expiryFont}px;
      margin: 0 0 ${isTiny ? "0.15mm" : "0.25mm"};
      flex-shrink: 0;
      line-height: 1;
      color: #333;
    }
    .label-barcode {
      flex-shrink: 1;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      max-height: ${isTiny ? "32%" : "46%"};
    }
    .label-barcode img {
      max-width: 100%;
      width: 100%;
      height: auto;
      max-height: ${isTiny ? "8mm" : "14mm"};
      object-fit: contain;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      -ms-interpolation-mode: nearest-neighbor;
      display: block;
    }
    .label-barcode-svg {
      flex-shrink: 1;
      min-height: 0;
      width: 100%;
      max-height: ${isTiny ? "30%" : "44%"};
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .label-barcode-svg svg {
      max-width: 100%;
      width: 100%;
      height: auto;
      max-height: ${isTiny ? "30%" : "44%"};
      display: block;
    }
    @media print {
      html, body { height: ${h} !important; max-height: ${h} !important; overflow: hidden !important; }
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="label-name">${escapedName}</div>
    ${priceLine}
    ${expLine}
    ${barcodeBlock}
  </div>
</body>
</html>`;

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);

      const iframe = document.createElement("iframe");
      iframe.setAttribute("aria-hidden", "true");
      iframe.title = "print-label";
      Object.assign(iframe.style, {
        position: "fixed",
        left: "-9999px",
        top: "0",
        width: "320px",
        height: "480px",
        border: "none",
        opacity: "0",
        pointerEvents: "none",
      });
      document.body.appendChild(iframe);

      const cleanup = () => {
        try {
          URL.revokeObjectURL(blobUrl);
          document.body.removeChild(iframe);
        } catch {
          /* ignore */
        }
      };

      let didPrint = false;
      const runPrint = () => {
        if (didPrint) return;
        didPrint = true;
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } finally {
          window.setTimeout(cleanup, 2000);
        }
      };

      iframe.onload = () => window.setTimeout(runPrint, 80);
      iframe.onerror = () => {
        cleanup();
        alert("تعذر تحضير الطباعة.");
      };
      iframe.src = blobUrl;
      window.setTimeout(() => {
        if (!didPrint && iframe.contentDocument?.readyState === "complete") runPrint();
      }, 400);
    })();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 overflow-y-auto" dir="rtl">
      <div ref={containerRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 my-4">
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
            التاريخ والرابط (مثل الموقع) يأتيان من المتصفح إذا بقي «رأس وتذييل الصفحة» مفعّلاً — عطّله في نافذة الطباعة (Chrome/Edge: More settings → Headers and footers). الهوامش: لا شيء، وحجم الورق = مقاس الملصق.
          </p>
        </div>

        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-900 text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 break-words">{itemName}</p>
          {salePrice != null && Number.isFinite(salePrice) && (
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-2">
              {Number(salePrice).toFixed(2)} ج.م
            </p>
          )}
          {expiryShort && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">صلاحية: {expiryShort}</p>
          )}
          <div className="flex justify-center overflow-hidden max-h-40">
            <svg ref={svgRef} className="max-w-full h-auto" />
          </div>
          <p className="text-xs font-mono text-gray-500 dark:text-gray-500 mt-2">{barcode}</p>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          يُحفظ اختيار المقاس على هذا الجهاز للمرة القادمة.
        </p>

        <details className="mt-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-right">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-gray-800 dark:text-gray-200">
            طابعات Xprinter (حرارية) — ضبط الإعدادات
          </summary>
          <div className="px-3 pb-3 pt-0 text-xs text-gray-700 dark:text-gray-300 leading-relaxed space-y-2 border-t border-gray-200 dark:border-gray-600">
            <p>
              <strong>1) طابق تست الطابعة:</strong> في أوراق التست غالباً يظهر <strong>SIZE</strong> (عرض×ارتفاع بالمم). اختر في القائمة أعلاه <strong>نفس المقاس</strong> — مثلاً 52×25 إن ظهر في التست. عرض الرول يختلف عن عرض الملصق: رول 58 مم قد يستخدم ملصقات أضيق (مثل 52 مم).
            </p>
            <p>
              <strong>2) عرض الرول:</strong> كثير من Xprinter إما <strong>رول 58 مم</strong> أو <strong>80 مم</strong>. اختر مقاساً يطابق <strong>عرض الملصق الفعلي</strong> (مثلاً 58×40 لرول 58؛ ملصق أضيق من الرول طبيعي).
            </p>
            <p>
              <strong>3) ويندوز:</strong> الإعدادات ← الطابعات ← اختر الطابعة ← خصائص الطابعة ← إعدادات الطباعة ← تبويب <strong>الورق</strong> أو <strong>Page</strong> ← <strong>حجم مخصص</strong> بنفس مقاس التست (مثل 52×25 أو 58×40) بالميليمتر. فعّل <strong>«طباعة حجم الملصق الفعلي»</strong> إن وُجد.
            </p>
            <p>
              <strong>4) نافذة الطباعة (Chrome/Edge):</strong> عطّل <strong>رأس وتذييل الصفحة</strong>؛ الهوامش <strong>لا شيء</strong>؛ التكبير <strong>100%</strong> وليس «ملاءمة للصفحة»؛ <strong>حجم الورق</strong> = نفس مقاس الملصق أو مخصص.
            </p>
            <p>
              <strong>5) الفجوة GAP:</strong> إن كان التست يعرض <strong>GAP</strong> (مثل 2 مم)، يجب أن يطابق إعداد «المسافة بين الملصقات» في برنامج التعريف/الأداة الرسمية للطابعة وإلا تزحف الطباعة بين الملصقات.
            </p>
            <p>
              <strong>6) إذا كان الباركود مضغوطاً أو ممتداً:</strong> جرّب مقاساً أقرب للتست، أو جرّب <strong>Edge</strong> بدل Chrome (أو العكس).
            </p>
            <p>
              <strong>7) التعريف:</strong> ثبّت تعريف <strong>Windows</strong> للطراز من الموقع الرسمي بدل «Generic / Text Only» — يحسّن المقاس والصورة. <strong>CODE PAGE 437</strong> في التست يخص وضع النص الخام؛ طباعة المتصفح غالباً صورة/رسومات والعربية تعمل، أما إن ظهرت رموز غريبة فالمشكلة غالباً من التعريف أو وضع الطباعة.
            </p>
          </div>
        </details>

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

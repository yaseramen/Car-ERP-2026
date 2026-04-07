"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarcodeTextInput } from "@/components/ui/barcode-text-input";

interface EditItemBarcodeProps {
  itemId: string;
  currentBarcode: string | null;
}

export function EditItemBarcode({ itemId, currentBarcode }: EditItemBarcodeProps) {
  const router = useRouter();
  const [value, setValue] = useState(currentBarcode ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/inventory/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: value.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.refresh();
      } else {
        alert(typeof data.error === "string" ? data.error : "فشل في حفظ الباركود");
      }
    } catch {
      alert("حدث خطأ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 w-full min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <BarcodeTextInput
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="امسح أو اكتب الباركود"
          className="flex-1 min-w-[8rem] max-w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm font-mono"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg disabled:opacity-50 shrink-0"
        >
          {saving ? "…" : "حفظ الباركود"}
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        اترك الحقل فارغاً ثم احفظ لإزالة الباركود. يجب ألا يتكرر نفس الباركود على صنف آخر.
      </p>
    </div>
  );
}

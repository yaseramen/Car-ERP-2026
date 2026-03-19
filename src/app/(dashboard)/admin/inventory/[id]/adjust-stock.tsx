"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AdjustStockProps {
  itemId: string;
  itemName: string;
  currentQuantity: number;
}

export function AdjustStock({ itemId, itemName, currentQuantity }: AdjustStockProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newQty, setNewQty] = useState(String(currentQuantity));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const newNum = Number(newQty) || 0;
  const delta = newNum - currentQuantity;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Number.isNaN(newNum) || newNum < 0) {
      alert("الكمية يجب أن تكون رقماً موجباً");
      return;
    }
    if (delta === 0) {
      alert("الكمية مطابقة للموجود. لا حاجة للتعديل.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/inventory/items/${itemId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_quantity: newNum, notes: notes.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "فشل في التعديل");
        return;
      }
      setOpen(false);
      setNewQty(String(newNum));
      setNotes("");
      router.refresh();
    } catch {
      alert("حدث خطأ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        تعديل الكمية (جرد)
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">تعديل الكمية (جرد) — {itemName}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              الكمية الحالية في النظام: <strong>{currentQuantity}</strong>
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الكمية الفعلية بعد الجرد</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="0"
                />
                {delta !== 0 && (
                  <p className={`mt-1 text-sm ${delta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {delta > 0 ? `+${delta} إضافة` : `${delta} خصم`}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات (اختياري)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="مثال: جرد شهري"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving || delta === 0}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-medium rounded-lg"
                >
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

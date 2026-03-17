"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CancelButtonProps {
  invoiceId: string;
  type: string;
  status: string;
}

export function CancelButton({ invoiceId, type, status }: CancelButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const canCancel = ["sale", "maintenance", "purchase"].includes(type) && status !== "returned" && status !== "cancelled";

  if (!canCancel) return null;

  async function handleCancel() {
    if (
      !confirm(
        "هل أنت متأكد من إلغاء هذه الفاتورة؟ سيتم إرجاع الأصناف للمخزن واسترداد المدفوعات. لا يمكن التراجع عن هذا الإجراء."
      )
    )
      return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}/cancel`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "فشل في إلغاء الفاتورة");
        return;
      }
      router.refresh();
    } catch {
      alert("حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={loading}
      className="no-print px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 font-medium rounded-lg transition-colors disabled:opacity-50"
    >
      {loading ? "جاري..." : "إلغاء الفاتورة"}
    </button>
  );
}

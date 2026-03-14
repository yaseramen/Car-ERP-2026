"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ReturnButtonProps {
  invoiceId: string;
  type: string;
  status: string;
}

export function ReturnButton({ invoiceId, type, status }: ReturnButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const canReturn = ["sale", "maintenance", "purchase"].includes(type) && status !== "returned" && status !== "cancelled";

  if (!canReturn) return null;

  async function handleReturn() {
    if (!confirm("هل أنت متأكد من تحويل هذه الفاتورة إلى مرتجع؟ سيتم إعادة الأصناف للمخزن (أو خصمها في فواتير الشراء).")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}/return`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "فشل في تنفيذ المرتجع");
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
      onClick={handleReturn}
      disabled={loading}
      className="no-print px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 font-medium rounded-lg transition-colors disabled:opacity-50"
    >
      {loading ? "جاري..." : "جعل مرتجع"}
    </button>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface AddPaymentProps {
  invoiceId: string;
  total: number;
  paidAmount: number;
  status: string;
}

export function AddPayment({ invoiceId, total, paidAmount, status }: AddPaymentProps) {
  const router = useRouter();
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; name: string }[]>([]);
  const [amount, setAmount] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const remaining = total - paidAmount;
  const isFullyPaid = status === "paid";

  useEffect(() => {
    fetch("/api/admin/payment-methods")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setPaymentMethods(data));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || !paymentMethodId) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          payment_method_id: paymentMethodId,
          reference_number: referenceNumber || undefined,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "فشل في تسجيل الدفع");
        return;
      }

      setAmount("");
      setReferenceNumber("");
      setNotes("");
      router.refresh();
    } catch {
      alert("حدث خطأ");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none";

  if (isFullyPaid) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <p className="text-emerald-800 font-medium">الفاتورة مدفوعة بالكامل</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="font-bold text-gray-900 mb-4">تسجيل دفعة</h2>
      <p className="text-sm text-gray-600 mb-4">المتبقي: {remaining.toFixed(2)} ج.م</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (ج.م) *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={remaining}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className={inputClass}
            placeholder={remaining.toFixed(2)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الدفع *</label>
          <select
            value={paymentMethodId}
            onChange={(e) => setPaymentMethodId(e.target.value)}
            required
            className={inputClass}
          >
            <option value="">اختر</option>
            {paymentMethods.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">رقم المرجع</label>
          <input
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            className={inputClass}
            placeholder="رقم الشيك أو التحويل"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
            placeholder="ملاحظات"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium rounded-lg transition-colors"
        >
          {saving ? "جاري..." : "تسجيل الدفعة"}
        </button>
      </form>
    </div>
  );
}

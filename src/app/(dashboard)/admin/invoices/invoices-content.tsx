"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const TYPE_LABELS: Record<string, string> = {
  sale: "بيع",
  purchase: "شراء",
  maintenance: "صيانة",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  pending: "معلقة",
  paid: "مدفوعة",
  partial: "مدفوعة جزئياً",
  returned: "مرتجع",
  cancelled: "ملغاة",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  partial: "bg-blue-100 text-blue-800",
  returned: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-500",
};

interface Invoice {
  id: string;
  invoice_number: string;
  type: string;
  status: string;
  subtotal: number;
  digital_service_fee: number;
  total: number;
  paid_amount: number;
  customer_name: string | null;
  order_number: string | null;
  vehicle_plate: string | null;
  repair_order_id: string | null;
  created_at: string;
}

export function InvoicesContent() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filteredInvoices =
    typeFilter === "all"
      ? invoices
      : invoices.filter((inv) => inv.type === typeFilter);

  async function fetchInvoices() {
    try {
      const res = await fetch("/api/admin/invoices");
      if (res.ok) setInvoices(await res.json());
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInvoices();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <p className="text-gray-500">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          { value: "all", label: "الكل" },
          { value: "sale", label: "بيع" },
          { value: "purchase", label: "شراء" },
          { value: "maintenance", label: "صيانة" },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTypeFilter(opt.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              typeFilter === opt.value
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">رقم الفاتورة</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">النوع</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الحالة</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">العميل / السيارة</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الإجمالي</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  {invoices.length === 0 ? "لا توجد فواتير حتى الآن" : "لا توجد فواتير بهذا النوع"}
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/invoices/${inv.id}`}
                      className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {TYPE_LABELS[inv.type] || inv.type}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        STATUS_COLORS[inv.status] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {STATUS_LABELS[inv.status] || inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {inv.customer_name || (inv.vehicle_plate ? `لوحة: ${inv.vehicle_plate}` : "—")}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {inv.total.toFixed(2)} ج.م
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(inv.created_at).toLocaleDateString("ar-EG")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}

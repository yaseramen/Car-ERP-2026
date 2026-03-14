"use client";

import { useState, useEffect } from "react";

interface Company {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  wallet_id: string | null;
  balance: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  company_name: string;
  performed_by_name: string | null;
  created_at: string;
}

export function WalletsContent() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeDesc, setChargeDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: "", phone: "", address: "" });

  async function fetchCompanies() {
    try {
      const res = await fetch("/api/admin/wallets/companies");
      if (res.ok) setCompanies(await res.json());
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTransactions() {
    try {
      const res = await fetch("/api/admin/wallets/transactions");
      if (res.ok) setTransactions(await res.json());
    } catch {
      setTransactions([]);
    }
  }

  useEffect(() => {
    fetchCompanies();
    fetchTransactions();
  }, []);

  async function handleCharge(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCompany) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/wallets/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          amount: Number(chargeAmount),
          description: chargeDesc.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "فشل في الشحن");
        return;
      }

      setModalOpen(false);
      setSelectedCompany(null);
      setChargeAmount("");
      setChargeDesc("");
      fetchCompanies();
      fetchTransactions();
    } catch {
      alert("حدث خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCompany(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/wallets/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCompany),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "فشل في الإنشاء");
        return;
      }

      const company = await res.json();
      setCompanies((prev) => [company, ...prev]);
      setAddCompanyOpen(false);
      setNewCompany({ name: "", phone: "", address: "" });
    } catch {
      alert("حدث خطأ");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none";

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <p className="text-gray-500">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-medium text-gray-900">الشركات والمحافظ</h2>
        <button
          onClick={() => setAddCompanyOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          إضافة شركة
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الشركة</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الهاتف</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الرصيد</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                    لا توجد شركات. اضغط "إضافة شركة" للبدء.
                  </td>
                </tr>
              ) : (
                companies.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.phone || "—"}</td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-600">
                      {c.balance.toFixed(2)} ج.م
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setSelectedCompany(c);
                          setModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition"
                      >
                        شحن
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-medium text-gray-900">آخر المعاملات</h2>
        </div>
        <div className="overflow-x-auto">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">لا توجد معاملات</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">التاريخ</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الشركة</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">المبلغ</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الوصف</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">بواسطة</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(tx.created_at).toLocaleString("ar-EG")}
                    </td>
                    <td className="px-4 py-3 text-sm">{tx.company_name}</td>
                    <td className="px-4 py-3 text-sm font-medium text-emerald-600">
                      +{tx.amount.toFixed(2)} ج.م
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{tx.description || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{tx.performed_by_name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">شحن محفظة: {selectedCompany.name}</h3>
              <p className="text-sm text-gray-500 mt-1">الرصيد الحالي: {selectedCompany.balance.toFixed(2)} ج.م</p>
            </div>
            <form onSubmit={handleCharge} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (ج.م) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف (اختياري)</label>
                <input
                  type="text"
                  value={chargeDesc}
                  onChange={(e) => setChargeDesc(e.target.value)}
                  className={inputClass}
                  placeholder="مثال: شحن رصيد"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setSelectedCompany(null);
                  }}
                  className="flex-1 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium rounded-lg transition-colors"
                >
                  {saving ? "جاري الشحن..." : "شحن"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {addCompanyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">إضافة شركة جديدة</h3>
            </div>
            <form onSubmit={handleAddCompany} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الشركة *</label>
                <input
                  type="text"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany((c) => ({ ...c, name: e.target.value }))}
                  required
                  className={inputClass}
                  placeholder="اسم المركز أو الشركة"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الهاتف</label>
                <input
                  type="text"
                  value={newCompany.phone}
                  onChange={(e) => setNewCompany((c) => ({ ...c, phone: e.target.value }))}
                  className={inputClass}
                  placeholder="01009376052"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                <input
                  type="text"
                  value={newCompany.address}
                  onChange={(e) => setNewCompany((c) => ({ ...c, address: e.target.value }))}
                  className={inputClass}
                  placeholder="عنوان المركز"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setAddCompanyOpen(false)}
                  className="flex-1 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium rounded-lg transition-colors"
                >
                  {saving ? "جاري الحفظ..." : "إضافة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";

interface Treasury {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  method_name: string | null;
  created_at: string;
}

function SettleButton({ treasuries, onSuccess }: { treasuries: Treasury[]; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [note, setNote] = useState("");

  const sales = treasuries.find((t) => t.type === "sales");
  const workshop = treasuries.find((t) => t.type === "workshop");
  const main = treasuries.find((t) => t.type === "main");
  const totalToSettle = (sales?.balance ?? 0) + (workshop?.balance ?? 0);

  if (!main || totalToSettle <= 0) return null;

  async function handleSettle() {
    if (!confirm(`تسليم ${totalToSettle.toFixed(2)} ج.م من خزينة المبيعات والورشة إلى الخزينة الرئيسية؟`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/treasuries/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "فشل في التسليم");
        return;
      }
      setModalOpen(false);
      setFromDate("");
      setToDate("");
      setNote("");
      onSuccess();
    } catch {
      alert("حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
      >
        تسليم إلى الخزينة الرئيسية
      </button>
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">تسليم إلى الخزينة الرئيسية</h3>
            <p className="text-sm text-gray-600 mb-4">
              المبلغ الإجمالي: <strong>{totalToSettle.toFixed(2)} ج.م</strong>
              <br />
              <span className="text-xs">(خزينة المبيعات: {sales?.balance?.toFixed(2)} + الورشة: {workshop?.balance?.toFixed(2)})</span>
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">من تاريخ</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">إلى تاريخ</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">ملاحظة</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300"
                  placeholder="تسليم نهاية اليوم"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSettle}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? "جاري..." : "تسليم"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function TreasuriesContent() {
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDesc, setTransferDesc] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchTreasuries() {
    try {
      const res = await fetch("/api/admin/treasuries");
      if (res.ok) {
        const data = await res.json();
        setTreasuries(data);
        if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
      }
    } catch {
      setTreasuries([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTransactions(id: string) {
    try {
      const res = await fetch(`/api/admin/treasuries/${id}/transactions`);
      if (res.ok) setTransactions(await res.json());
      else setTransactions([]);
    } catch {
      setTransactions([]);
    }
  }

  useEffect(() => {
    fetchTreasuries();
  }, []);

  useEffect(() => {
    if (selectedId) fetchTransactions(selectedId);
  }, [selectedId]);

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!transferFrom || !transferTo || !transferAmount || Number(transferAmount) <= 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/treasuries/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_id: transferFrom,
          to_id: transferTo,
          amount: Number(transferAmount),
          description: transferDesc.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "فشل في التحويل");
        return;
      }

      setTransferOpen(false);
      setTransferFrom("");
      setTransferTo("");
      setTransferAmount("");
      setTransferDesc("");
      fetchTreasuries();
      if (selectedId) fetchTransactions(selectedId);
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {treasuries.map((t) => (
          <div
            key={t.id}
            className={`bg-white rounded-xl p-6 shadow-sm border-2 transition-colors cursor-pointer ${
              selectedId === t.id ? "border-emerald-500" : "border-gray-100 hover:border-gray-200"
            }`}
            onClick={() => setSelectedId(t.id)}
          >
            <h3 className="font-bold text-gray-900">{t.name}</h3>
            <p className="text-2xl font-bold text-emerald-600 mt-2">{t.balance.toFixed(2)} ج.م</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => {
            if (treasuries.length >= 2) {
              setTransferFrom(treasuries[0].id);
              setTransferTo(treasuries[1].id);
              setTransferOpen(true);
            }
          }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
        >
          تحويل بين الخزائن
        </button>
        <SettleButton treasuries={treasuries} onSuccess={fetchTreasuries} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">
            حركة {treasuries.find((t) => t.id === selectedId)?.name ?? "الخزينة"}
          </h2>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">لا توجد حركات</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {transactions.map((tx) => (
                <li key={tx.id} className="p-4 flex justify-between items-center text-sm">
                  <div>
                    <span className="text-gray-600">{tx.description || tx.method_name || "—"}</span>
                    <span className="text-gray-400 mr-2">
                      — {new Date(tx.created_at).toLocaleString("ar-EG")}
                    </span>
                  </div>
                  <span className={tx.amount >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                    {tx.amount >= 0 ? "+" : ""}{tx.amount.toFixed(2)} ج.م
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {transferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">تحويل بين الخزائن</h3>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">من</label>
                <select
                  value={transferFrom}
                  onChange={(e) => setTransferFrom(e.target.value)}
                  required
                  className={inputClass}
                >
                  {treasuries.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">إلى</label>
                <select
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  required
                  className={inputClass}
                >
                  {treasuries.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (ج.م) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظة</label>
                <input
                  type="text"
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  className={inputClass}
                  placeholder="تحويل بين الخزائن"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferOpen(false)}
                  className="flex-1 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium rounded-lg transition-colors"
                >
                  {saving ? "جاري..." : "تحويل"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

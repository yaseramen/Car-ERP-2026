"use client";

import { useState, useEffect } from "react";

const STAGES = [
  { id: "received", label: "استلام", color: "bg-blue-100 text-blue-800" },
  { id: "inspection", label: "فحص", color: "bg-amber-100 text-amber-800" },
  { id: "maintenance", label: "صيانة", color: "bg-purple-100 text-purple-800" },
  { id: "ready", label: "جاهزة", color: "bg-emerald-100 text-emerald-800" },
  { id: "completed", label: "مكتمل", color: "bg-gray-100 text-gray-800" },
];

interface RepairOrder {
  id: string;
  order_number: string;
  customer_name: string | null;
  vehicle_plate: string;
  vehicle_model: string | null;
  vehicle_year: number | null;
  stage: string;
  inspection_notes: string | null;
  received_at: string;
  completed_at: string | null;
  created_at: string;
}

export function WorkshopContent() {
  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vehicle_plate: "",
    vehicle_model: "",
    vehicle_year: "",
    mileage: "",
  });

  async function fetchOrders() {
    try {
      const res = await fetch("/api/admin/workshop/orders");
      if (res.ok) setOrders(await res.json());
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/workshop/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_plate: form.vehicle_plate.trim(),
          vehicle_model: form.vehicle_model.trim() || undefined,
          vehicle_year: form.vehicle_year ? Number(form.vehicle_year) : undefined,
          mileage: form.mileage ? Number(form.mileage) : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "فشل في الإنشاء");
        return;
      }

      await fetchOrders();
      setModalOpen(false);
      setForm({ vehicle_plate: "", vehicle_model: "", vehicle_year: "", mileage: "" });
    } catch {
      alert("حدث خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function updateStage(orderId: string, newStage: string) {
    try {
      const res = await fetch(`/api/admin/workshop/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "فشل في التحديث");
        return;
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, stage: newStage } : o))
      );
    } catch {
      alert("حدث خطأ");
    }
  }

  const getNextStage = (current: string) => {
    const idx = STAGES.findIndex((s) => s.id === current);
    return idx < STAGES.length - 1 ? STAGES[idx + 1] : null;
  };

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
        <h2 className="font-medium text-gray-900">أوامر الإصلاح</h2>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          استلام سيارة جديدة
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {STAGES.map((stage) => {
          const stageOrders = orders.filter((o) => o.stage === stage.id);
          return (
            <div
              key={stage.id}
              className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden"
            >
              <div className={`p-3 ${stage.color} font-medium text-sm`}>
                {stage.label}
                <span className="mr-2 text-opacity-80">({stageOrders.length})</span>
              </div>
              <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
                {stageOrders.map((order) => {
                  const next = getNextStage(order.stage);
                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm"
                    >
                      <div className="font-medium text-gray-900">{order.order_number}</div>
                      <div className="text-sm text-gray-600 mt-1">{order.vehicle_plate}</div>
                      {order.vehicle_model && (
                        <div className="text-xs text-gray-500">{order.vehicle_model}</div>
                      )}
                      {next && (
                        <button
                          onClick={() => updateStage(order.id, next.id)}
                          className="mt-2 w-full py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded transition"
                        >
                          ← {next.label}
                        </button>
                      )}
                    </div>
                  );
                })}
                {stageOrders.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">فارغ</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">استلام سيارة جديدة</h3>
              <p className="text-sm text-gray-500 mt-1">المرحلة الأولى: استلام</p>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم اللوحة *</label>
                <input
                  type="text"
                  value={form.vehicle_plate}
                  onChange={(e) => setForm((f) => ({ ...f, vehicle_plate: e.target.value }))}
                  required
                  className={inputClass}
                  placeholder="أ ب ج 1234"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">موديل السيارة</label>
                <input
                  type="text"
                  value={form.vehicle_model}
                  onChange={(e) => setForm((f) => ({ ...f, vehicle_model: e.target.value }))}
                  className={inputClass}
                  placeholder="تويوتا كورولا"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">سنة الصنع</label>
                  <input
                    type="number"
                    value={form.vehicle_year}
                    onChange={(e) => setForm((f) => ({ ...f, vehicle_year: e.target.value }))}
                    className={inputClass}
                    placeholder="2020"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الكمية (كم)</label>
                  <input
                    type="number"
                    value={form.mileage}
                    onChange={(e) => setForm((f) => ({ ...f, mileage: e.target.value }))}
                    className={inputClass}
                    placeholder="50000"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium rounded-lg transition-colors"
                >
                  {saving ? "جاري..." : "استلام"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export function SuppliersContent() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  async function fetchSuppliers() {
    try {
      const res = await fetch("/api/admin/suppliers");
      if (res.ok) setSuppliers(await res.json());
    } catch {
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSuppliers();
  }, []);

  function resetForm() {
    setForm({ name: "", phone: "", email: "", address: "", notes: "" });
    setEditSupplier(null);
  }

  function openEditModal(s: Supplier) {
    setEditSupplier(s);
    setForm({
      name: s.name,
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      notes: s.notes || "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (editSupplier) {
        const res = await fetch(`/api/admin/suppliers/${editSupplier.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "فشل في التحديث");
          return;
        }
        setSuppliers((prev) =>
          prev.map((s) => (s.id === editSupplier.id ? { ...s, ...payload } : s))
        );
      } else {
        const res = await fetch("/api/admin/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "فشل في الحفظ");
          return;
        }
        const newSupplier = await res.json();
        setSuppliers((prev) => [newSupplier, ...prev]);
      }

      setModalOpen(false);
      resetForm();
    } catch {
      alert("حدث خطأ. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s: Supplier) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/suppliers/${s.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "فشل في الحذف");
        return;
      }
      const data = await res.json();
      setSuppliers((prev) => prev.filter((x) => x.id !== s.id));
      setDeleteConfirm(null);
      if (data.message) alert(data.message);
    } catch {
      alert("حدث خطأ. حاول مرة أخرى.");
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
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-medium text-gray-900">قائمة الموردين</h2>
          <button
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            إضافة مورد جديد
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الاسم</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الهاتف</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">البريد</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                    لا يوجد موردون. اضغط "إضافة مورد جديد" للبدء.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.phone || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.email || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          className="px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(s)}
                          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editSupplier ? "تعديل مورد" : "إضافة مورد جديد"}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className={inputClass}
                  placeholder="اسم المورد"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الهاتف</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className={inputClass}
                  placeholder="01xxxxxxxxx"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={inputClass}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className={inputClass}
                  placeholder="العنوان"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className={inputClass}
                  rows={3}
                  placeholder="ملاحظات إضافية"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
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
                  {saving ? "جاري الحفظ..." : editSupplier ? "تحديث" : "حفظ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">تأكيد الحذف</h3>
            <p className="text-gray-600 mb-6">
              هل أنت متأكد من حذف المورد &quot;{deleteConfirm.name}&quot;؟
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-lg transition-colors"
              >
                {saving ? "جاري الحذف..." : "حذف"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

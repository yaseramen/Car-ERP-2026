"use client";

import { useState, useEffect } from "react";
import { addToQueue } from "@/lib/offline-queue";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export function CustomersContent() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  async function fetchCustomers() {
    try {
      const res = await fetch("/api/admin/customers");
      if (res.ok) setCustomers(await res.json());
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    const handleOnline = () => fetchCustomers();
    window.addEventListener("alameen-online", handleOnline);
    return () => window.removeEventListener("alameen-online", handleOnline);
  }, []);

  function resetForm() {
    setForm({ name: "", phone: "", email: "", address: "", notes: "" });
    setEditCustomer(null);
  }

  function openEditModal(c: Customer) {
    setEditCustomer(c);
    setForm({
      name: c.name,
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
      notes: c.notes || "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    setSaving(true);
    try {
      if (editCustomer) {
        if (!navigator.onLine) {
          addToQueue({
            type: "edit_customer",
            customerId: editCustomer.id,
            data: {
              name: payload.name,
              phone: payload.phone ?? null,
              email: payload.email ?? null,
              address: payload.address ?? null,
              notes: payload.notes ?? null,
            },
          });
          setModalOpen(false);
          resetForm();
          alert("انقطع الاتصال. تم حفظ التعديل محلياً. سيتم إرساله تلقائياً عند عودة الإنترنت.");
          return;
        }
        const res = await fetch(`/api/admin/customers/${editCustomer.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "فشل في التحديث");
          return;
        }
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === editCustomer.id
              ? {
                  ...c,
                  name: payload.name,
                  phone: payload.phone ?? null,
                  email: payload.email ?? null,
                  address: payload.address ?? null,
                  notes: payload.notes ?? null,
                }
              : c
          )
        );
      } else {
        if (!navigator.onLine) {
          addToQueue({ type: "add_customer", data: payload });
          setModalOpen(false);
          resetForm();
          alert("انقطع الاتصال. تم حفظ العميل محلياً. سيتم إضافته تلقائياً عند عودة الإنترنت.");
          return;
        }
        const res = await fetch("/api/admin/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "فشل في الحفظ");
          return;
        }
        const newCustomer = await res.json();
        setCustomers((prev) => [newCustomer, ...prev]);
      }

      setModalOpen(false);
      resetForm();
    } catch {
      if (editCustomer && !navigator.onLine) {
        addToQueue({
          type: "edit_customer",
          customerId: editCustomer.id,
          data: {
            name: payload.name,
            phone: payload.phone ?? null,
            email: payload.email ?? null,
            address: payload.address ?? null,
            notes: payload.notes ?? null,
          },
        });
        setModalOpen(false);
        resetForm();
        alert("انقطع الاتصال. تم حفظ التعديل محلياً. سيتم إرساله تلقائياً عند عودة الإنترنت.");
      } else if (!editCustomer && !navigator.onLine) {
        addToQueue({ type: "add_customer", data: payload });
        setModalOpen(false);
        resetForm();
        alert("انقطع الاتصال. تم حفظ العميل محلياً. سيتم إضافته تلقائياً عند عودة الإنترنت.");
      } else {
        alert("حدث خطأ. حاول مرة أخرى.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: Customer) {
    setSaving(true);
    try {
      if (!navigator.onLine) {
        addToQueue({ type: "delete_customer", customerId: c.id });
        setCustomers((prev) => prev.filter((x) => x.id !== c.id));
        setDeleteConfirm(null);
        alert("انقطع الاتصال. تم حفظ الحذف محلياً. سيتم تنفيذه تلقائياً عند عودة الإنترنت.");
        return;
      }
      const res = await fetch(`/api/admin/customers/${c.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "فشل في الحذف");
        return;
      }
      const data = await res.json();
      setCustomers((prev) => prev.filter((x) => x.id !== c.id));
      setDeleteConfirm(null);
      if (data.message) alert(data.message);
    } catch {
      if (!navigator.onLine) {
        addToQueue({ type: "delete_customer", customerId: c.id });
        setCustomers((prev) => prev.filter((x) => x.id !== c.id));
        setDeleteConfirm(null);
        alert("انقطع الاتصال. تم حفظ الحذف محلياً. سيتم تنفيذه تلقائياً عند عودة الإنترنت.");
      } else {
        alert("حدث خطأ. حاول مرة أخرى.");
      }
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none";

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 className="font-medium text-gray-900 dark:text-gray-100">قائمة العملاء</h2>
          <button
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            إضافة عميل جديد
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-600">
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الاسم</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الهاتف</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">البريد</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    لا يوجد عملاء. اضغط "إضافة عميل جديد" للبدء.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{c.phone || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{c.email || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => openEditModal(c)}
                          className="px-3 py-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition"
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(c)}
                          className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {editCustomer ? "تعديل عميل" : "إضافة عميل جديد"}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className={inputClass}
                  placeholder="اسم العميل"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الهاتف</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className={inputClass}
                  placeholder="01xxxxxxxxx"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">البريد الإلكتروني</label>
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
                  className="flex-1 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium rounded-lg transition-colors"
                >
                  {saving ? "جاري الحفظ..." : editCustomer ? "تحديث" : "حفظ"}
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
              هل أنت متأكد من حذف العميل &quot;{deleteConfirm.name}&quot;؟
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
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

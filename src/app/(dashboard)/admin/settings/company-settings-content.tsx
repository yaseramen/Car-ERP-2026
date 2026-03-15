"use client";

import { useState, useEffect } from "react";

export function CompanySettingsContent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    tax_number: "",
    commercial_registration: "",
  });

  useEffect(() => {
    fetch("/api/admin/company")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setMessage({ type: "error", text: d.error });
        } else {
          setForm({
            name: d.name ?? "",
            phone: d.phone ?? "",
            address: d.address ?? "",
            tax_number: d.tax_number ?? "",
            commercial_registration: d.commercial_registration ?? "",
          });
        }
      })
      .catch(() => setMessage({ type: "error", text: "فشل تحميل البيانات" }))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: data.error || "فشل التحديث" });
    } else {
      setMessage({ type: "success", text: data.message || "تم الحفظ بنجاح" });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="text-gray-500">جاري التحميل...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      {message && (
        <div
          className={`p-4 rounded-lg ${message.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}
        >
          {message.text}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">اسم الشركة</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
        <input
          type="text"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder="مثال: 01009376052"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
        <input
          type="text"
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder="عنوان الشركة"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">رقم البطاقة الضريبية</label>
        <input
          type="text"
          value={form.tax_number}
          onChange={(e) => setForm((f) => ({ ...f, tax_number: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder="إن وجد"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">رقم السجل التجاري</label>
        <input
          type="text"
          value={form.commercial_registration}
          onChange={(e) => setForm((f) => ({ ...f, commercial_registration: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder="إن وجد"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
      </button>
    </form>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BarcodeScanner } from "@/components/inventory/barcode-scanner";

interface Item {
  id: string;
  name: string;
  code: string | null;
  barcode: string | null;
  category: string | null;
  unit: string;
  purchase_price: number;
  sale_price: number;
  quantity: number;
}

export function InventoryTable() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [form, setForm] = useState({
    name: "",
    code: "",
    barcode: "",
    category: "",
    unit: "قطعة",
    purchase_price: "",
    sale_price: "",
  });

  async function fetchItems() {
    try {
      const res = await fetch("/api/admin/inventory/items");
      if (res.ok) setItems(await res.json());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch("/api/admin/inventory/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setUnits(data.units || []);
      }
    } catch {}
  }

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          barcode: form.barcode.trim() || undefined,
          category: (form.category === "__new__" ? newCategory : form.category)?.trim() || null,
          unit: (form.unit === "__new__" ? newUnit : form.unit)?.trim() || "قطعة",
          purchase_price: Number(form.purchase_price) || 0,
          sale_price: Number(form.sale_price) || 0,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "فشل في الحفظ");
        return;
      }

      const newItem = await res.json();
      setItems((prev) => [newItem, ...prev]);
      setModalOpen(false);
      setForm({
        name: "",
        code: "",
        barcode: "",
        category: "",
        unit: "قطعة",
        purchase_price: "",
        sale_price: "",
      });
      setNewCategory("");
      setNewUnit("");
      fetchCategories();
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
          <h2 className="font-medium text-gray-900">الأصناف</h2>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            إضافة صنف جديد
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">اسم القطعة</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الكود</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الباركود</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">القسم</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الكمية</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">سعر التكلفة</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">سعر البيع</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    لا توجد أصناف. اضغط "إضافة صنف جديد" للبدء.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/inventory/${item.id}`}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.code || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.barcode || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.category || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.purchase_price.toFixed(2)} ج.م</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.sale_price.toFixed(2)} ج.م</td>
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
              <h3 className="text-lg font-bold text-gray-900">إضافة صنف جديد</h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم القطعة *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className={inputClass}
                  placeholder="مثال: زيت محرك 5W30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الكود (تلقائي إن تُرك فارغاً)</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  className={inputClass}
                  placeholder="مثال: OIL-001 أو اتركه للتوليد التلقائي"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الباركود (تلقائي إن تُرك فارغاً)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.barcode}
                    onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                    className={inputClass}
                    placeholder="امسح أو اكتب الباركود"
                  />
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition shrink-0"
                    title="مسح بالكاميرا"
                  >
                    مسح
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
                <select
                  value={form.category}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, category: e.target.value }));
                    if (e.target.value === "__new__") setNewCategory("");
                  }}
                  className={inputClass}
                >
                  <option value="">اختر القسم</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__new__">+ إضافة قسم جديد</option>
                </select>
                {form.category === "__new__" && (
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className={`${inputClass} mt-2`}
                    placeholder="اسم القسم الجديد"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوحدة</label>
                <select
                  value={form.unit}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, unit: e.target.value }));
                    if (e.target.value === "__new__") setNewUnit("");
                  }}
                  className={inputClass}
                >
                  {units.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                  <option value="__new__">+ إضافة وحدة جديدة</option>
                </select>
                {form.unit === "__new__" && (
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className={`${inputClass} mt-2`}
                    placeholder="اسم الوحدة الجديدة"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">سعر التكلفة (ج.م)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.purchase_price}
                    onChange={(e) => setForm((f) => ({ ...f, purchase_price: e.target.value }))}
                    className={inputClass}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">سعر البيع (ج.م)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.sale_price}
                    onChange={(e) => setForm((f) => ({ ...f, sale_price: e.target.value }))}
                    className={inputClass}
                    placeholder="0"
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
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScanner && (
        <BarcodeScanner
          onScan={(value) => {
            setForm((f) => ({ ...f, barcode: value }));
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}

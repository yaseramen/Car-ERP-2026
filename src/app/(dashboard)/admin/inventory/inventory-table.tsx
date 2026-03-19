"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BarcodeScanner } from "@/components/inventory/barcode-scanner";
import { addToQueue } from "@/lib/offline-queue";

interface Item {
  id: string;
  name: string;
  code: string | null;
  barcode: string | null;
  category: string | null;
  unit: string;
  purchase_price: number;
  sale_price: number;
  min_quantity: number;
  quantity: number;
}

export function InventoryTable() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [editingCell, setEditingCell] = useState<{ itemId: string; field: "category" | "min_quantity" } | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    barcode: "",
    category: "",
    unit: "قطعة",
    sale_price: "",
    min_quantity_enabled: false,
    min_quantity: "",
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

  useEffect(() => {
    const handleOnline = () => {
      fetchItems();
      fetchCategories();
    };
    window.addEventListener("alameen-online", handleOnline);
    return () => window.removeEventListener("alameen-online", handleOnline);
  }, []);

  function resetForm() {
    setForm({
      name: "",
      code: "",
      barcode: "",
      category: "",
      unit: "قطعة",
      sale_price: "",
      min_quantity_enabled: false,
      min_quantity: "",
    });
    setNewCategory("");
    setNewUnit("");
    setEditItem(null);
  }

  async function saveInlineEdit(itemId: string, field: "category" | "min_quantity", value: string | number) {
    const payload: Record<string, unknown> = {};
    if (field === "category") {
      payload.category = (value as string)?.trim() || null;
    } else {
      const num = Number(value);
      payload.min_quantity = num > 0 ? num : 0;
      payload.min_quantity_enabled = num > 0;
    }

    try {
      if (!navigator.onLine) {
        addToQueue({ type: "inventory_item_patch", itemId, data: payload });
        setItems((prev) =>
          prev.map((i) => {
            if (i.id !== itemId) return i;
            if (field === "category") return { ...i, category: (value as string)?.trim() || null };
            return { ...i, min_quantity: value ? Number(value) : 0 };
          })
        );
        setEditingCell(null);
        alert("انقطع الاتصال. تم حفظ التعديل محلياً. سيتم إرساله تلقائياً عند عودة الإنترنت.");
        return;
      }
      const res = await fetch(`/api/admin/inventory/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "فشل في التحديث");
        return;
      }
      setItems((prev) =>
        prev.map((i) => {
          if (i.id !== itemId) return i;
          if (field === "category") return { ...i, category: (value as string)?.trim() || null };
          return { ...i, min_quantity: value ? Number(value) : 0 };
        })
      );
      setEditingCell(null);
    } catch {
      if (!navigator.onLine) {
        addToQueue({ type: "inventory_item_patch", itemId, data: payload });
        setItems((prev) =>
          prev.map((i) => {
            if (i.id !== itemId) return i;
            if (field === "category") return { ...i, category: (value as string)?.trim() || null };
            return { ...i, min_quantity: value ? Number(value) : 0 };
          })
        );
        setEditingCell(null);
        alert("انقطع الاتصال. تم حفظ التعديل محلياً. سيتم إرساله تلقائياً عند عودة الإنترنت.");
      } else {
        alert("حدث خطأ");
      }
    }
  }

  function openEditModal(item: Item) {
    setEditItem(item);
    setForm({
      name: item.name,
      code: item.code || "",
      barcode: item.barcode || "",
      category: item.category || "",
      unit: item.unit || "قطعة",
      sale_price: String(item.sale_price),
      min_quantity_enabled: item.min_quantity > 0,
      min_quantity: item.min_quantity > 0 ? String(item.min_quantity) : "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        barcode: form.barcode.trim() || undefined,
        category: (form.category === "__new__" ? newCategory : form.category)?.trim() || null,
        unit: (form.unit === "__new__" ? newUnit : form.unit)?.trim() || "قطعة",
        sale_price: Number(form.sale_price) || 0,
        min_quantity_enabled: form.min_quantity_enabled,
        min_quantity: form.min_quantity_enabled ? Number(form.min_quantity) || 0 : 0,
      };

      if (editItem) {
        const patchPayload = { ...payload };
        delete patchPayload.purchase_price;
        const patchData = {
          name: (patchPayload.name as string) || "",
          code: (patchPayload.code as string) ?? null,
          barcode: (patchPayload.barcode as string) ?? null,
          category: (patchPayload.category as string) ?? null,
          unit: (patchPayload.unit as string) || "قطعة",
          sale_price: Number(patchPayload.sale_price) || 0,
          min_quantity_enabled: Boolean(patchPayload.min_quantity_enabled),
          min_quantity: patchPayload.min_quantity_enabled ? Number(patchPayload.min_quantity) || 0 : 0,
        };

        if (!navigator.onLine) {
          addToQueue({ type: "inventory_item_full_patch", itemId: editItem.id, data: patchData });
          setItems((prev) =>
            prev.map((i) =>
              i.id === editItem.id
                ? {
                    ...i,
                    name: payload.name as string,
                    code: (payload.code as string) ?? null,
                    barcode: (payload.barcode as string) ?? null,
                    category: (payload.category as string) ?? null,
                    unit: payload.unit as string,
                    sale_price: payload.sale_price as number,
                    min_quantity: payload.min_quantity_enabled ? (payload.min_quantity as number) : 0,
                  }
                : i
            )
          );
          setModalOpen(false);
          resetForm();
          alert("انقطع الاتصال. تم حفظ التعديل محلياً. سيتم إرساله تلقائياً عند عودة الإنترنت.");
          return;
        }

        const res = await fetch(`/api/admin/inventory/items/${editItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchPayload),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "فشل في التحديث");
          return;
        }
        setItems((prev) =>
          prev.map((i) =>
            i.id === editItem.id
              ? {
                  ...i,
                  name: payload.name as string,
                  code: (payload.code as string) ?? null,
                  barcode: (payload.barcode as string) ?? null,
                  category: (payload.category as string) ?? null,
                  unit: payload.unit as string,
                  sale_price: payload.sale_price as number,
                  min_quantity: payload.min_quantity_enabled ? (payload.min_quantity as number) : 0,
                }
              : i
          )
        );
      } else {
        const postPayload = { ...payload, purchase_price: 0 };
        const res = await fetch("/api/admin/inventory/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(postPayload),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "فشل في الحفظ");
          return;
        }
        const newItem = await res.json();
        setItems((prev) => [newItem, ...prev]);
        fetchCategories();
      }

      setModalOpen(false);
      resetForm();
    } catch {
      if (editItem && !navigator.onLine) {
        const patchData = {
          name: form.name.trim(),
          code: form.code.trim() || null,
          barcode: form.barcode.trim() || null,
          category: (form.category === "__new__" ? newCategory : form.category)?.trim() || null,
          unit: (form.unit === "__new__" ? newUnit : form.unit)?.trim() || "قطعة",
          sale_price: Number(form.sale_price) || 0,
          min_quantity_enabled: form.min_quantity_enabled,
          min_quantity: form.min_quantity_enabled ? Number(form.min_quantity) || 0 : 0,
        } as const;
        addToQueue({ type: "inventory_item_full_patch", itemId: editItem.id, data: { ...patchData } });
        setModalOpen(false);
        resetForm();
        alert("انقطع الاتصال. تم حفظ التعديل محلياً. سيتم إرساله تلقائياً عند عودة الإنترنت.");
      } else {
        alert("حدث خطأ. حاول مرة أخرى.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: Item) {
    setSaving(true);
    try {
      if (!navigator.onLine) {
        addToQueue({ type: "delete_item", itemId: item.id });
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setDeleteConfirm(null);
        alert("انقطع الاتصال. تم حفظ الحذف محلياً. سيتم تنفيذه تلقائياً عند عودة الإنترنت.");
        return;
      }
      const res = await fetch(`/api/admin/inventory/items/${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "فشل في الحذف");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setDeleteConfirm(null);
      fetchCategories();
    } catch {
      if (!navigator.onLine) {
        addToQueue({ type: "delete_item", itemId: item.id });
        setItems((prev) => prev.filter((i) => i.id !== item.id));
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
    "w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none";

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">جاري التحميل...</p>
      </div>
    );
  }

  const lowStockItems = items.filter((i) => i.min_quantity > 0 && i.quantity < i.min_quantity * 0.8);
  const approachingLimitItems = items.filter((i) => i.min_quantity > 0 && i.quantity >= i.min_quantity * 0.8 && i.quantity < i.min_quantity);

  return (
    <>
      {lowStockItems.length > 0 && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-amber-800 dark:text-amber-200">تنبيه: أصناف أقل من 80% من الحد الأدنى ({lowStockItems.length})</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map((item) => (
              <Link
                key={item.id}
                href={`/admin/purchases?item=${item.id}&qty=${Math.max(1, item.min_quantity - item.quantity)}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition"
              >
                <span>{item.name}</span>
                <span className="text-amber-600 dark:text-amber-300">
                  ({item.quantity} / {item.min_quantity})
                </span>
                <span className="text-xs opacity-75">→ طلب شراء</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {approachingLimitItems.length > 0 && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-blue-800 dark:text-blue-200">تنبيه: أصناف قريبة من الحد الأدنى ({approachingLimitItems.length})</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {approachingLimitItems.map((item) => (
              <Link
                key={item.id}
                href={`/admin/purchases?item=${item.id}&qty=${Math.max(1, item.min_quantity - item.quantity)}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
              >
                <span>{item.name}</span>
                <span className="text-blue-600 dark:text-blue-300">({item.quantity} / {item.min_quantity})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 className="font-medium text-gray-900 dark:text-gray-100">الأصناف</h2>
          <button
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            إضافة صنف جديد
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">اسم القطعة</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الكود</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الباركود</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">القسم</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الكمية</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الحد الأدنى</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">سعر البيع</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    لا توجد أصناف. اضغط "إضافة صنف جديد" للبدء.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/inventory/${item.id}`}
                        className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.code || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono">{item.barcode || "—"}</td>
                    <td className="px-4 py-3 text-sm">
                      {editingCell?.itemId === item.id && editingCell?.field === "category" ? (
                        <select
                          autoFocus
                          value={item.category || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "__new__") {
                              const newCat = prompt("اسم القسم الجديد:");
                              if (newCat?.trim()) {
                                saveInlineEdit(item.id, "category", newCat.trim());
                                if (!categories.includes(newCat.trim())) setCategories((prev) => [...prev, newCat.trim()].sort());
                              }
                              setEditingCell(null);
                            } else {
                              saveInlineEdit(item.id, "category", v);
                            }
                          }}
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (v && v !== "__new__") saveInlineEdit(item.id, "category", v);
                            setEditingCell(null);
                          }}
                          className="w-full min-w-[100px] px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                          <option value="">—</option>
                          {[...new Set([...(item.category ? [item.category] : []), ...categories])].sort().map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                          <option value="__new__">+ إضافة قسم جديد</option>
                        </select>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingCell({ itemId: item.id, field: "category" })}
                          className="text-right w-full block px-2 py-1 -mx-2 -my-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300 min-h-[28px]"
                          title="اضغط للتعديل"
                        >
                          {item.category || "—"}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={item.min_quantity > 0 && item.quantity < item.min_quantity ? "text-amber-600 dark:text-amber-400 font-medium" : "text-gray-900 dark:text-gray-100"}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {editingCell?.itemId === item.id && editingCell?.field === "min_quantity" ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          autoFocus
                          defaultValue={item.min_quantity > 0 ? item.min_quantity : ""}
                          placeholder="—"
                          onBlur={(e) => {
                            const v = e.target.value;
                            saveInlineEdit(item.id, "min_quantity", v ? Number(v) : 0);
                            setEditingCell(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const v = (e.target as HTMLInputElement).value;
                              saveInlineEdit(item.id, "min_quantity", v ? Number(v) : 0);
                              setEditingCell(null);
                            }
                            if (e.key === "Escape") setEditingCell(null);
                          }}
                          className="w-20 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingCell({ itemId: item.id, field: "min_quantity" })}
                          className="text-right w-full block px-2 py-1 -mx-2 -my-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300 min-h-[28px]"
                          title="اضغط للتعديل"
                        >
                          {item.min_quantity > 0 ? item.min_quantity : "—"}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{item.sale_price.toFixed(2)} ج.م</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="px-3 py-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition"
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(item)}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editItem ? "تعديل صنف" : "إضافة صنف جديد"}
              </h3>
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
                    className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition shrink-0"
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

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.min_quantity_enabled}
                    onChange={(e) => setForm((f) => ({ ...f, min_quantity_enabled: e.target.checked }))}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-gray-700">تفعيل تنبيه الحد الأدنى</span>
                </label>
              </div>

              {form.min_quantity_enabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأدنى للكمية</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.min_quantity}
                    onChange={(e) => setForm((f) => ({ ...f, min_quantity: e.target.value }))}
                    className={inputClass}
                    placeholder="مثال: 5"
                  />
                  <p className="text-xs text-gray-500 mt-1">سيظهر تنبيه عندما تقل الكمية عن هذا الرقم</p>
                </div>
              )}

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
                  {saving ? "جاري الحفظ..." : editItem ? "تحديث" : "حفظ"}
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
              هل أنت متأكد من حذف الصنف &quot;{deleteConfirm.name}&quot;؟
              {deleteConfirm.quantity > 0 && (
                <span className="block mt-2 text-amber-600 text-sm">
                  الصنف له كمية ({deleteConfirm.quantity})، سيتم تعطيله إذا كان مستخدماً في فواتير سابقة.
                </span>
              )}
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

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface CartItem {
  item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InventoryItem {
  id: string;
  name: string;
  purchase_price: number;
}

interface Supplier {
  id: string;
  name: string;
}

export function PurchasesContent() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<{ id: string; invoice_number: string } | null>(null);

  const [addItemId, setAddItemId] = useState("");
  const [addQty, setAddQty] = useState("1");
  const [addPrice, setAddPrice] = useState("");

  async function fetchData() {
    try {
      const [itemsRes, suppliersRes] = await Promise.all([
        fetch("/api/admin/inventory/items"),
        fetch("/api/admin/suppliers"),
      ]);
      if (itemsRes.ok) setItems(await itemsRes.json());
      if (suppliersRes.ok) setSuppliers(await suppliersRes.json());
    } catch {}
  }

  useEffect(() => {
    fetchData();
  }, []);

  function addToCart() {
    const item = items.find((i) => i.id === addItemId);
    if (!item || Number(addQty) <= 0) return;

    const qty = Number(addQty);
    const price = Number(addPrice) || item.purchase_price;
    const total = qty * price;

    const existing = cart.find((c) => c.item_id === item.id);
    if (existing) {
      const newQty = existing.quantity + qty;
      const newPrice = (existing.quantity * existing.unit_price + total) / newQty;
      setCart((prev) =>
        prev.map((c) =>
          c.item_id === item.id
            ? { ...c, quantity: newQty, unit_price: newPrice, total: newQty * newPrice }
            : c
        )
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          item_id: item.id,
          name: item.name,
          quantity: qty,
          unit_price: price,
          total,
        },
      ]);
    }
    setAddItemId("");
    setAddQty("1");
    setAddPrice("");
  }

  function removeFromCart(itemId: string) {
    setCart((prev) => prev.filter((c) => c.item_id !== itemId));
  }

  function updateCartItem(itemId: string, qty: number, price: number) {
    if (qty <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((c) =>
        c.item_id === itemId
          ? { ...c, quantity: qty, unit_price: price, total: qty * price }
          : c
      )
    );
  }

  const subtotal = cart.reduce((sum, c) => sum + c.total, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) {
      alert("أضف أصنافاً للفاتورة");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/invoices/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: supplierId || undefined,
          items: cart.map((c) => ({
            item_id: c.item_id,
            quantity: c.quantity,
            unit_price: c.unit_price,
          })),
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "فشل في إنشاء فاتورة الشراء");
        return;
      }

      const data = await res.json();
      setLastInvoice({ id: data.id, invoice_number: data.invoice_number });
      setCart([]);
      setSupplierId("");
      setNotes("");
      fetchData();
    } catch {
      alert("حدث خطأ. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-4">إضافة صنف</h2>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-500 mb-1">الصنف</label>
              <select
                value={addItemId}
                onChange={(e) => {
                  setAddItemId(e.target.value);
                  const item = items.find((i) => i.id === e.target.value);
                  if (item) setAddPrice(String(item.purchase_price));
                }}
                className={inputClass}
              >
                <option value="">اختر الصنف</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="block text-xs text-gray-500 mb-1">الكمية</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
                className="px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs text-gray-500 mb-1">سعر الشراء</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={addPrice}
                onChange={(e) => setAddPrice(e.target.value)}
                className="px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900"
                placeholder="0"
              />
            </div>
            <button
              type="button"
              onClick={addToCart}
              disabled={!addItemId}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
            >
              إضافة
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">بنود الفاتورة ({cart.length})</h2>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="p-8 text-center text-gray-500">فارغ</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {cart.map((c) => (
                  <li key={c.item_id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{c.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={c.quantity}
                          onChange={(e) => updateCartItem(c.item_id, Number(e.target.value), c.unit_price)}
                          className="w-20 px-2 py-1 text-sm rounded border border-gray-300"
                        />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={c.unit_price}
                          onChange={(e) => updateCartItem(c.item_id, c.quantity, Number(e.target.value))}
                          className="w-24 px-2 py-1 text-sm rounded border border-gray-300"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{c.total.toFixed(2)} ج.م</span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(c.item_id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        حذف
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 mb-4">إنشاء فاتورة شراء</h2>

        {lastInvoice && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-emerald-800 font-medium">تم إنشاء الفاتورة بنجاح</p>
            <Link
              href={`/admin/invoices/${lastInvoice.id}`}
              className="text-emerald-600 hover:text-emerald-700 font-medium mt-1 inline-block"
            >
              {lastInvoice.invoice_number} — عرض الفاتورة
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المورد</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className={inputClass}
            >
              <option value="">بدون مورد</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="flex justify-between font-bold text-lg">
              <span>الإجمالي</span>
              <span className="text-emerald-600">{subtotal.toFixed(2)} ج.م</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
              rows={2}
              placeholder="ملاحظات..."
            />
          </div>

          <button
            type="submit"
            disabled={saving || cart.length === 0}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold rounded-lg transition-colors"
          >
            {saving ? "جاري الإنشاء..." : "إنشاء فاتورة شراء"}
          </button>
        </form>
      </div>
    </div>
  );
}

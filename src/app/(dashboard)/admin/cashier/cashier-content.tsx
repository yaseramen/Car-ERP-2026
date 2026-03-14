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
  quantity: number;
  sale_price: number;
}

interface Customer {
  id: string;
  name: string;
}

interface PaymentMethod {
  id: string;
  name: string;
}

export function CashierContent() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<{ id: string; invoice_number: string } | null>(null);

  const [addItemId, setAddItemId] = useState("");
  const [addQty, setAddQty] = useState("1");

  async function fetchData() {
    try {
      const [itemsRes, customersRes, methodsRes] = await Promise.all([
        fetch("/api/admin/inventory/items"),
        fetch("/api/admin/customers"),
        fetch("/api/admin/payment-methods"),
      ]);
      if (itemsRes.ok) setItems(await itemsRes.json());
      if (customersRes.ok) setCustomers(await customersRes.json());
      if (methodsRes.ok) setPaymentMethods(await methodsRes.json());
    } catch {}
  }

  useEffect(() => {
    fetchData();
  }, []);

  function addToCart() {
    const item = items.find((i) => i.id === addItemId);
    if (!item || Number(addQty) <= 0) return;
    if (item.quantity < Number(addQty)) {
      alert(`الكمية المتاحة: ${item.quantity}`);
      return;
    }

    const existing = cart.find((c) => c.item_id === item.id);
    const qty = Number(addQty);
    if (existing) {
      const newQty = existing.quantity + qty;
      if (item.quantity < newQty) {
        alert(`الكمية المتاحة: ${item.quantity}`);
        return;
      }
      setCart((prev) =>
        prev.map((c) =>
          c.item_id === item.id
            ? { ...c, quantity: newQty, total: newQty * c.unit_price }
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
          unit_price: item.sale_price,
          total: qty * item.sale_price,
        },
      ]);
    }
    setAddItemId("");
    setAddQty("1");
  }

  function removeFromCart(itemId: string) {
    setCart((prev) => prev.filter((c) => c.item_id !== itemId));
  }

  function updateCartQty(itemId: string, qty: number) {
    const item = items.find((i) => i.id === itemId);
    const cartItem = cart.find((c) => c.item_id === itemId);
    if (!item || !cartItem) return;
    const available = item.quantity;
    if (qty > available) {
      alert(`الكمية المتاحة: ${available}`);
      return;
    }
    if (qty <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((c) =>
        c.item_id === itemId ? { ...c, quantity: qty, total: qty * c.unit_price } : c
      )
    );
  }

  const subtotal = cart.reduce((sum, c) => sum + c.total, 0);
  const digitalFee = Math.max(0.5, subtotal * 0.0001);
  const total = subtotal + digitalFee;
  const paid = Number(paidAmount) || 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) {
      alert("أضف أصنافاً للسلة");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/invoices/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId || undefined,
          items: cart.map((c) => ({ item_id: c.item_id, quantity: c.quantity })),
          payment_method_id: paymentMethodId || undefined,
          paid_amount: paid > 0 ? paid : undefined,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "فشل في إنشاء الفاتورة");
        return;
      }

      const data = await res.json();
      setLastInvoice({ id: data.id, invoice_number: data.invoice_number });
      setCart([]);
      setCustomerId("");
      setPaymentMethodId("");
      setPaidAmount("");
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
          <div className="flex gap-2">
            <select
              value={addItemId}
              onChange={(e) => setAddItemId(e.target.value)}
              className={inputClass}
            >
              <option value="">اختر الصنف</option>
              {items
                .filter((i) => i.quantity > 0)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} (متاح: {i.quantity}) — {i.sale_price.toFixed(2)} ج.م
                  </option>
                ))}
            </select>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={addQty}
              onChange={(e) => setAddQty(e.target.value)}
              className="w-24 px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900"
              placeholder="كم"
            />
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
            <h2 className="font-bold text-gray-900">السلة ({cart.length})</h2>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="p-8 text-center text-gray-500">السلة فارغة</div>
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
                          onChange={(e) => updateCartQty(c.item_id, Number(e.target.value))}
                          className="w-20 px-2 py-1 text-sm rounded border border-gray-300"
                        />
                        <span className="text-sm text-gray-500">× {c.unit_price.toFixed(2)} ج.م</span>
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
        <h2 className="font-bold text-gray-900 mb-4">إتمام البيع</h2>

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
            <label className="block text-sm font-medium text-gray-700 mb-1">العميل</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className={inputClass}
            >
              <option value="">بدون عميل</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">المجموع</span>
              <span className="font-medium">{subtotal.toFixed(2)} ج.م</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">الخدمة الرقمية</span>
              <span className="font-medium">{digitalFee.toFixed(2)} ج.م</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100">
              <span>الإجمالي</span>
              <span className="text-emerald-600">{total.toFixed(2)} ج.م</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الدفع</label>
            <select
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {paymentMethods.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ المدفوع (ج.م)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              className={inputClass}
              placeholder="0"
            />
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
            {saving ? "جاري الإنشاء..." : "إنشاء فاتورة بيع"}
          </button>
        </form>
      </div>
    </div>
  );
}

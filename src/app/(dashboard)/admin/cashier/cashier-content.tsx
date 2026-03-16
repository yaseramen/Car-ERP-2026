"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { BarcodeScanner } from "@/components/inventory/barcode-scanner";

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
  code?: string | null;
  barcode?: string | null;
  quantity: number;
  sale_price: number;
}

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
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

  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: "", phone: "", email: "" });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

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

  function findItemByBarcodeOrCode(value: string): InventoryItem | undefined {
    const v = String(value || "").trim().toLowerCase();
    if (!v) return undefined;
    return items.find(
      (i) =>
        i.quantity > 0 &&
        ((i.barcode && String(i.barcode).trim().toLowerCase() === v) ||
          (i.code && String(i.code).trim().toLowerCase() === v))
    );
  }

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

  function addItemToCartByScan(item: InventoryItem, qty: number = 1) {
    if (item.quantity < qty) {
      alert(`الكمية المتاحة: ${item.quantity}`);
      return;
    }
    const existing = cart.find((c) => c.item_id === item.id);
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

  async function handleAddCustomer(e: React.FormEvent) {
    if (e?.preventDefault) e.preventDefault();
    if (!newCustomerForm.name.trim()) {
      alert("اسم العميل مطلوب");
      return;
    }
    setSavingCustomer(true);
    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCustomerForm.name.trim(),
          phone: newCustomerForm.phone.trim() || undefined,
          email: newCustomerForm.email.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "فشل في إضافة العميل");
        return;
      }
      const newCustomer = await res.json();
      setCustomers((prev) => [
        { id: newCustomer.id, name: newCustomer.name, phone: newCustomer.phone ?? null },
        ...prev,
      ]);
      setCustomerId(newCustomer.id);
      setAddCustomerOpen(false);
      setNewCustomerForm({ name: "", phone: "", email: "" });
      fetchData();
    } catch {
      alert("حدث خطأ");
    } finally {
      setSavingCustomer(false);
    }
  }

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-4">إضافة صنف (ابحث بالاسم أو الكود أو امسح الباركود)</h2>
          <div className="flex gap-2">
            <div className="flex-1 min-w-[200px]">
              <SearchableSelect
                options={items
                  .filter((i) => i.quantity > 0)
                  .map((i) => ({
                    id: i.id,
                    label: `${i.name} (متاح: ${i.quantity}) — ${i.sale_price.toFixed(2)} ج.م`,
                    searchText: [i.code, i.barcode, i.name].filter(Boolean).join(" "),
                  }))}
                value={addItemId}
                onChange={(id) => setAddItemId(id)}
                placeholder="ابحث بالاسم أو الكود..."
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowBarcodeScanner(true)}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg shrink-0"
              title="مسح الباركود"
            >
              📷
            </button>
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

      {showBarcodeScanner && (
        <BarcodeScanner
          onScan={(value) => {
            const item = findItemByBarcodeOrCode(value);
            if (item) {
              addItemToCartByScan(item);
            } else {
              alert("لم يتم العثور على صنف بهذا الباركود أو الكود");
            }
            setShowBarcodeScanner(false);
          }}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}

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
            <label className="block text-sm font-medium text-gray-700 mb-1">العميل (ابحث بالاسم أو رقم الهاتف)</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <SearchableSelect
                  options={[
                    { id: "", label: "بدون عميل" },
                    ...customers.map((c) => ({
                      id: c.id,
                      label: c.name,
                      searchText: c.phone ? String(c.phone) : undefined,
                    })),
                  ]}
                  value={customerId}
                  onChange={(id) => setCustomerId(id)}
                  placeholder="ابحث بالاسم أو رقم الهاتف..."
                  addNewLabel="+ إضافة عميل جديد"
                  addNewFirst
                  onAddNew={() => setAddCustomerOpen(true)}
                  className={inputClass}
                />
              </div>
              <button
                type="button"
                onClick={() => setAddCustomerOpen(true)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg shrink-0"
              >
                +
              </button>
            </div>
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

      {addCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">إضافة عميل جديد</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم *</label>
                <input
                  type="text"
                  value={newCustomerForm.name}
                  onChange={(e) => setNewCustomerForm((f) => ({ ...f, name: e.target.value }))}
                  className={inputClass}
                  placeholder="اسم العميل"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الهاتف</label>
                <input
                  type="text"
                  value={newCustomerForm.phone}
                  onChange={(e) => setNewCustomerForm((f) => ({ ...f, phone: e.target.value }))}
                  className={inputClass}
                  placeholder="01xxxxxxxxx"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البريد</label>
                <input
                  type="email"
                  value={newCustomerForm.email}
                  onChange={(e) => setNewCustomerForm((f) => ({ ...f, email: e.target.value }))}
                  className={inputClass}
                  placeholder="email@example.com"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAddCustomerOpen(false);
                    setNewCustomerForm({ name: "", phone: "", email: "" });
                  }}
                  className="flex-1 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={(e) => handleAddCustomer(e as unknown as React.FormEvent)}
                  disabled={savingCustomer}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium rounded-lg transition-colors"
                >
                  {savingCustomer ? "جاري..." : "إضافة"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const STAGE_LABELS: Record<string, string> = {
  received: "استلام",
  inspection: "فحص",
  maintenance: "صيانة",
  ready: "جاهزة",
  completed: "مكتمل",
};

interface Order {
  id: string;
  order_number: string;
  vehicle_plate: string;
  vehicle_model: string | null;
  vehicle_year: number | null;
  mileage: number | null;
  vin: string | null;
  stage: string;
  inspection_notes: string | null;
  received_at: string | null;
  completed_at: string | null;
  customer_name: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  invoice_subtotal: number | null;
  invoice_digital_fee: number | null;
  invoice_total: number | null;
}

interface Item {
  id: string;
  item_name: string;
  item_unit: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Service {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface PrevOrder {
  id: string;
  order_number: string;
  vehicle_plate: string;
  stage: string;
  inspection_notes: string | null;
  received_at: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  invoice_total: number | null;
}

const canEdit = (stage: string, orderType: string, invoiceId: string | null) =>
  !invoiceId && (stage === "maintenance" || stage === "ready" || (orderType === "inspection" && (stage === "inspection" || stage === "ready")));

const canAddParts = (stage: string, orderType: string) =>
  (stage === "maintenance" || stage === "ready") && orderType !== "inspection";

const canAddServices = (stage: string, orderType: string) =>
  stage === "maintenance" || stage === "ready" || (orderType === "inspection" && (stage === "inspection" || stage === "ready"));

export function RepairOrderEditContent({
  order,
  items: initialItems,
  services: initialServices,
  itemsTotal: initialItemsTotal,
  servicesTotal: initialServicesTotal,
  orderType,
  previousOrders,
}: {
  order: Order;
  items: Item[];
  services: Service[];
  itemsTotal: number;
  servicesTotal: number;
  orderType: string;
  previousOrders: PrevOrder[];
}) {
  const [items, setItems] = useState(initialItems);
  const [services, setServices] = useState(initialServices);
  const [itemsTotal, setItemsTotal] = useState(initialItemsTotal);
  const [servicesTotal, setServicesTotal] = useState(initialServicesTotal);
  const [inspectionNotes, setInspectionNotes] = useState(order.inspection_notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [addPartOpen, setAddPartOpen] = useState(false);
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<{ id: string; name: string; quantity: number }[]>([]);
  const [addForm, setAddForm] = useState({ item_id: "", quantity: "1" });
  const [serviceForm, setServiceForm] = useState({ description: "", quantity: "1", unit_price: "" });
  const [saving, setSaving] = useState(false);

  const editable = canEdit(order.stage, orderType, order.invoice_id);

  const refreshItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/workshop/orders/${order.id}/items`);
      if (res.ok) {
        const list = await res.json();
        setItems(list);
        setItemsTotal(list.reduce((s: number, i: Item) => s + i.total, 0));
      }
    } catch {}
  }, [order.id]);

  const refreshServices = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/workshop/orders/${order.id}/services`);
      if (res.ok) {
        const list = await res.json();
        setServices(list);
        setServicesTotal(list.reduce((s: number, sv: Service) => s + sv.total, 0));
      }
    } catch {}
  }, [order.id]);

  useEffect(() => {
    if (addPartOpen && inventoryItems.length === 0) {
      fetch("/api/admin/inventory/items?limit=500&offset=0")
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => {
          const list = Array.isArray(d) ? d : (d.items ?? []);
          setInventoryItems(list.map((i: { id: string; name: string; quantity?: number }) => ({ id: i.id, name: i.name, quantity: i.quantity ?? 0 })));
        });
    }
  }, [addPartOpen, inventoryItems.length]);

  async function saveNotes() {
    if (!editable) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/admin/workshop/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: order.stage, inspection_notes: inspectionNotes }),
      });
      if (res.ok) setInspectionNotes(inspectionNotes);
      else {
        const err = await res.json();
        alert(err.error || "فشل في حفظ الملاحظات");
      }
    } catch {
      alert("حدث خطأ");
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleAddPart(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.item_id) {
      alert("اختر قطعة");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/workshop/orders/${order.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: addForm.item_id, quantity: addForm.quantity }),
      });
      if (res.ok) {
        await refreshItems();
        setAddForm({ item_id: "", quantity: "1" });
        setAddPartOpen(false);
      } else {
        const err = await res.json();
        alert(err.error || "فشل في إضافة القطعة");
      }
    } catch {
      alert("حدث خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveItem(itemId: string) {
    if (!editable || !confirm("إزالة هذه القطعة؟")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/workshop/orders/${order.id}/items?item_id=${encodeURIComponent(itemId)}`, { method: "DELETE" });
      if (res.ok) await refreshItems();
      else {
        const err = await res.json();
        alert(err.error || "فشل في الإزالة");
      }
    } catch {
      alert("حدث خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddService(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceForm.description.trim()) {
      alert("وصف الخدمة مطلوب");
      return;
    }
    const qty = Number(serviceForm.quantity) || 1;
    const price = Number(serviceForm.unit_price) || 0;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/workshop/orders/${order.id}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: serviceForm.description.trim(), quantity: qty, unit_price: price }),
      });
      if (res.ok) {
        await refreshServices();
        setServiceForm({ description: "", quantity: "1", unit_price: "" });
        setAddServiceOpen(false);
      } else {
        const err = await res.json();
        alert(err.error || "فشل في إضافة الخدمة");
      }
    } catch {
      alert("حدث خطأ");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveService(serviceId: string) {
    if (!editable || !confirm("إزالة هذه الخدمة؟")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/workshop/orders/${order.id}/services?service_id=${encodeURIComponent(serviceId)}`, { method: "DELETE" });
      if (res.ok) await refreshServices();
      else {
        const err = await res.json();
        alert(err.error || "فشل في الإزالة");
      }
    } catch {
      alert("حدث خطأ");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500";

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <Link href="/admin/workshop" className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300">
          ← العودة للورشة
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">أمر إصلاح {order.order_number}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          تقرير كامل لأمر الإصلاح — {order.vehicle_plate}
          {order.vehicle_model && ` • ${order.vehicle_model}`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">بيانات السيارة</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">رقم اللوحة</dt>
              <dd className="text-gray-900 dark:text-gray-100 font-medium">{order.vehicle_plate}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">الموديل</dt>
              <dd className="text-gray-900 dark:text-gray-100">{order.vehicle_model || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">سنة الصنع</dt>
              <dd className="text-gray-900 dark:text-gray-100">{order.vehicle_year || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">الكمية (كم)</dt>
              <dd className="text-gray-900 dark:text-gray-100">{order.mileage != null ? order.mileage.toLocaleString("ar-EG") : "—"}</dd>
            </div>
            {order.vin && (
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">VIN</dt>
                <dd className="text-gray-900 dark:text-gray-100 font-mono text-xs">{order.vin}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">حالة الأمر</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">المرحلة</dt>
              <dd>
                <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200">
                  {STAGE_LABELS[order.stage] || order.stage}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">العميل</dt>
              <dd className="text-gray-900 dark:text-gray-100">{order.customer_name || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">تاريخ الاستلام</dt>
              <dd className="text-gray-900 dark:text-gray-100">
                {order.received_at ? new Date(order.received_at).toLocaleString("ar-EG") : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">تاريخ الإكمال</dt>
              <dd className="text-gray-900 dark:text-gray-100">
                {order.completed_at ? new Date(order.completed_at).toLocaleString("ar-EG") : "—"}
              </dd>
            </div>
            {order.invoice_number && (
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">رقم الفاتورة</dt>
                <dd className="text-gray-900 dark:text-gray-100 font-medium">
                  {order.invoice_id ? (
                    <Link href={`/admin/invoices/${order.invoice_id}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">
                      {order.invoice_number}
                    </Link>
                  ) : (
                    order.invoice_number
                  )}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {previousOrders.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-8">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-bold text-gray-900 dark:text-gray-100">سجل الزيارات السابقة</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">رقم الأمر</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">اللوحة</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">المرحلة</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">ملاحظات الفحص</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الفاتورة</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {previousOrders.map((prev) => (
                  <tr key={prev.id} className="border-b border-gray-50 dark:border-gray-700">
                    <td className="px-4 py-3 text-sm">
                      <Link href={`/admin/workshop/${prev.id}`} className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
                        {prev.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{prev.vehicle_plate}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {STAGE_LABELS[prev.stage] || prev.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[200px] truncate" title={prev.inspection_notes ?? undefined}>
                      {prev.inspection_notes ? (prev.inspection_notes.length > 50 ? prev.inspection_notes.slice(0, 50) + "…" : prev.inspection_notes) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {prev.invoice_number && prev.invoice_id ? (
                        <Link href={`/admin/invoices/${prev.invoice_id}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">
                          {prev.invoice_number} ({prev.invoice_total?.toFixed(0)} ج.م)
                        </Link>
                      ) : prev.invoice_number ? (
                        <span>{prev.invoice_number} ({prev.invoice_total?.toFixed(0)} ج.م)</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {prev.received_at ? new Date(prev.received_at).toLocaleDateString("ar-EG") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
        <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-2">ملاحظات الفحص</h2>
        {editable ? (
          <div className="space-y-2">
            <textarea
              value={inspectionNotes}
              onChange={(e) => setInspectionNotes(e.target.value)}
              placeholder="أدخل ملاحظات الفحص..."
              rows={4}
              className={`${inputClass} resize-none`}
            />
            <button
              type="button"
              onClick={saveNotes}
              disabled={savingNotes}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-sm font-medium rounded-lg transition"
            >
              {savingNotes ? "جاري الحفظ..." : "حفظ الملاحظات"}
            </button>
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap">{order.inspection_notes || "—"}</p>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-8">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">القطع المثبتة</h2>
          {editable && canAddParts(order.stage, orderType) && (
            <button
              type="button"
              onClick={() => setAddPartOpen(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition"
            >
              إضافة قطعة
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          {items.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الصنف</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الكمية</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">سعر الوحدة</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الإجمالي</th>
                  {editable && <th className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 w-16" />}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 dark:border-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{item.item_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {item.quantity} {item.item_unit}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{item.unit_price.toFixed(2)} ج.م</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{item.total.toFixed(2)} ج.م</td>
                    {editable && (
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={saving}
                          className="text-red-600 hover:text-red-700 text-sm disabled:opacity-50"
                        >
                          إزالة
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-700/50 font-medium">
                  <td colSpan={editable ? 4 : 3} className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">
                    المجموع (القطع)
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{itemsTotal.toFixed(2)} ج.م</td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              لم تُضف قطع حتى الآن
              {editable && canAddParts(order.stage, orderType) && (
                <button
                  type="button"
                  onClick={() => setAddPartOpen(true)}
                  className="block mx-auto mt-2 text-purple-600 hover:text-purple-700 text-sm"
                >
                  إضافة قطعة
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-8">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">الخدمات</h2>
          {editable && canAddServices(order.stage, orderType) && (
            <button
              type="button"
              onClick={() => setAddServiceOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
            >
              إضافة خدمة
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          {services.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الوصف</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الكمية</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">سعر الوحدة</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الإجمالي</th>
                  {editable && <th className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 w-16" />}
                </tr>
              </thead>
              <tbody>
                {services.map((sv) => (
                  <tr key={sv.id} className="border-b border-gray-50 dark:border-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{sv.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{sv.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{sv.unit_price.toFixed(2)} ج.م</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{sv.total.toFixed(2)} ج.م</td>
                    {editable && (
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveService(sv.id)}
                          disabled={saving}
                          className="text-red-600 hover:text-red-700 text-sm disabled:opacity-50"
                        >
                          إزالة
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-700/50 font-medium">
                  <td colSpan={editable ? 4 : 3} className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">
                    المجموع (الخدمات)
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{servicesTotal.toFixed(2)} ج.م</td>
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-700/50 font-medium">
                  <td colSpan={editable ? 4 : 3} className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">
                    المجموع الكلي
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{(itemsTotal + servicesTotal).toFixed(2)} ج.م</td>
                </tr>
                {order.invoice_digital_fee != null && order.invoice_digital_fee > 0 && (
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    <td colSpan={editable ? 4 : 3} className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">
                      الخدمة الرقمية
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{order.invoice_digital_fee.toFixed(2)} ج.م</td>
                  </tr>
                )}
                {order.invoice_total != null && (
                  <tr className="bg-emerald-50 dark:bg-emerald-900/50 font-bold">
                    <td colSpan={editable ? 4 : 3} className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">
                      الإجمالي النهائي
                    </td>
                    <td className="px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">{order.invoice_total.toFixed(2)} ج.م</td>
                  </tr>
                )}
              </tfoot>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              لم تُضف خدمات حتى الآن
              {editable && canAddServices(order.stage, orderType) && (
                <button
                  type="button"
                  onClick={() => setAddServiceOpen(true)}
                  className="block mx-auto mt-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  إضافة خدمة
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {addPartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">إضافة قطعة</h3>
            <form onSubmit={handleAddPart} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">الصنف</label>
                <select
                  value={addForm.item_id}
                  onChange={(e) => setAddForm((f) => ({ ...f, item_id: e.target.value }))}
                  required
                  className={inputClass}
                >
                  <option value="">اختر الصنف</option>
                  {inventoryItems.filter((i) => i.quantity > 0).map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (متاح: {i.quantity})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الكمية</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={addForm.quantity}
                  onChange={(e) => setAddForm((f) => ({ ...f, quantity: e.target.value }))}
                  required
                  className={inputClass}
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setAddPartOpen(false)} className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 rounded-lg">
                  إلغاء
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50">
                  {saving ? "جاري..." : "إضافة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {addServiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">إضافة خدمة</h3>
            <form onSubmit={handleAddService} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">وصف الخدمة *</label>
                <input
                  type="text"
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm((f) => ({ ...f, description: e.target.value }))}
                  required
                  className={inputClass}
                  placeholder="مثال: فحص المحرك"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">الكمية</label>
                  <input
                    type="number"
                    min="0.01"
                    value={serviceForm.quantity}
                    onChange={(e) => setServiceForm((f) => ({ ...f, quantity: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">السعر (ج.م)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={serviceForm.unit_price}
                    onChange={(e) => setServiceForm((f) => ({ ...f, unit_price: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setAddServiceOpen(false)} className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 rounded-lg">
                  إلغاء
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
                  {saving ? "جاري..." : "إضافة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

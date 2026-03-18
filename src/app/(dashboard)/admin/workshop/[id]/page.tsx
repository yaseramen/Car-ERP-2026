import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db/client";
import { getCompanyId } from "@/lib/company";
import { canAccess } from "@/lib/permissions";

const STAGE_LABELS: Record<string, string> = {
  received: "استلام",
  inspection: "فحص",
  maintenance: "صيانة",
  ready: "جاهزة",
  completed: "مكتمل",
};

export default async function RepairOrderReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || !["super_admin", "tenant_owner", "employee"].includes(session.user.role ?? "")) {
    redirect("/login");
  }

  const companyId = getCompanyId(session);
  if (!companyId) redirect("/login");

  if (session.user.role === "employee") {
    const allowed = await canAccess(session.user.id, "employee", companyId, "workshop", "read");
    if (!allowed) redirect("/admin");
  }

  const { id } = await params;

  try {
    const orderResult = await db.execute({
      sql: `SELECT ro.*, c.name as customer_name, inv.invoice_number, inv.subtotal, inv.digital_service_fee, inv.total as invoice_total
            FROM repair_orders ro
            LEFT JOIN customers c ON ro.customer_id = c.id
            LEFT JOIN invoices inv ON ro.invoice_id = inv.id
            WHERE ro.id = ? AND ro.company_id = ?`,
      args: [id, companyId],
    });

    if (orderResult.rows.length === 0) notFound();

    const row = orderResult.rows[0];
    const order = {
      id: String(row.id),
      order_number: String(row.order_number ?? ""),
      vehicle_plate: String(row.vehicle_plate ?? ""),
      vehicle_model: row.vehicle_model ? String(row.vehicle_model) : null,
      vehicle_year: row.vehicle_year != null ? Number(row.vehicle_year) : null,
      mileage: row.mileage != null ? Number(row.mileage) : null,
      vin: row.vin ? String(row.vin) : null,
      stage: String(row.stage ?? "received"),
      inspection_notes: row.inspection_notes ? String(row.inspection_notes) : null,
      estimated_completion: row.estimated_completion ? String(row.estimated_completion) : null,
      received_at: row.received_at ? String(row.received_at) : null,
      completed_at: row.completed_at ? String(row.completed_at) : null,
      created_at: String(row.created_at ?? ""),
      customer_name: row.customer_name ? String(row.customer_name) : null,
      invoice_number: row.invoice_number ? String(row.invoice_number) : null,
      invoice_subtotal: row.subtotal != null ? Number(row.subtotal) : null,
      invoice_digital_fee: row.digital_service_fee != null ? Number(row.digital_service_fee) : null,
      invoice_total: row.invoice_total != null ? Number(row.invoice_total) : null,
    };

    const itemsResult = await db.execute({
      sql: `SELECT roi.*, i.name as item_name, i.unit as item_unit
            FROM repair_order_items roi
            JOIN items i ON roi.item_id = i.id
            WHERE roi.repair_order_id = ?
            ORDER BY roi.created_at`,
      args: [id],
    });

    const items = itemsResult.rows.map((r) => ({
      id: String(r.id),
      item_name: String(r.item_name ?? ""),
      item_unit: String(r.item_unit ?? "قطعة"),
      quantity: Number(r.quantity ?? 0),
      unit_price: Number(r.unit_price ?? 0),
      total: Number(r.total ?? 0),
    }));

    const itemsTotal = items.reduce((sum, i) => sum + i.total, 0);

    return (
      <div className="p-8">
        <div className="mb-6">
          <Link
            href="/admin/workshop"
            className="text-sm text-emerald-600 hover:text-emerald-700"
          >
            ← العودة للورشة
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            أمر إصلاح {order.order_number}
          </h1>
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
                <dt className="text-gray-500">رقم اللوحة</dt>
                <dd className="text-gray-900 font-medium">{order.vehicle_plate}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">الموديل</dt>
                <dd className="text-gray-900">{order.vehicle_model || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">سنة الصنع</dt>
                <dd className="text-gray-900">{order.vehicle_year || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">الكمية (كم)</dt>
                <dd className="text-gray-900">{order.mileage != null ? order.mileage.toLocaleString("ar-EG") : "—"}</dd>
              </div>
              {order.vin && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">VIN</dt>
                  <dd className="text-gray-900 font-mono text-xs">{order.vin}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-900 mb-4">حالة الأمر</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">المرحلة</dt>
                <dd>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                    {STAGE_LABELS[order.stage] || order.stage}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">العميل</dt>
                <dd className="text-gray-900">{order.customer_name || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">تاريخ الاستلام</dt>
                <dd className="text-gray-900">
                  {order.received_at ? new Date(order.received_at).toLocaleString("ar-EG") : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">تاريخ الإكمال</dt>
                <dd className="text-gray-900">
                  {order.completed_at ? new Date(order.completed_at).toLocaleString("ar-EG") : "—"}
                </dd>
              </div>
              {order.invoice_number && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">رقم الفاتورة</dt>
                  <dd className="text-gray-900 font-medium">{order.invoice_number}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {order.inspection_notes && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-2">ملاحظات الفحص</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap">{order.inspection_notes}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-8">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-bold text-gray-900 dark:text-gray-100">القطع المثبتة</h2>
          </div>
          <div className="overflow-x-auto">
            {items.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الصنف</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الكمية</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">سعر الوحدة</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{item.item_name}</td>
                      <td className="px-4 py-3 text-sm">{item.quantity} {item.item_unit}</td>
                      <td className="px-4 py-3 text-sm">{item.unit_price.toFixed(2)} ج.م</td>
                      <td className="px-4 py-3 text-sm font-medium">{item.total.toFixed(2)} ج.م</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-medium">
                    <td colSpan={3} className="px-4 py-3 text-sm text-right">المجموع (القطع)</td>
                    <td className="px-4 py-3 text-sm">{itemsTotal.toFixed(2)} ج.م</td>
                  </tr>
                  {order.invoice_digital_fee != null && order.invoice_digital_fee > 0 && (
                    <tr className="bg-gray-50">
                      <td colSpan={3} className="px-4 py-3 text-sm text-right">الخدمة الرقمية</td>
                      <td className="px-4 py-3 text-sm">{order.invoice_digital_fee.toFixed(2)} ج.م</td>
                    </tr>
                  )}
                  {order.invoice_total != null && (
                    <tr className="bg-emerald-50 font-bold">
                      <td colSpan={3} className="px-4 py-3 text-sm text-right">الإجمالي النهائي</td>
                      <td className="px-4 py-3 text-sm text-emerald-700">{order.invoice_total.toFixed(2)} ج.م</td>
                    </tr>
                  )}
                </tfoot>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-500">لم تُضف قطع حتى الآن</div>
            )}
          </div>
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}

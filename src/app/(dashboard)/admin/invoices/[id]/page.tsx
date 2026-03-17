import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db/client";
import { getCompanyId } from "@/lib/company";
import { DEVELOPER_INFO } from "@/lib/invoice-config";
import { AddPayment } from "./add-payment";
import { InvoiceActions } from "./invoice-actions";
import { PartialReturnButton } from "./partial-return-button";
import { ReturnButton } from "./return-button";
import { CancelButton } from "./cancel-button";

export default async function InvoiceDetailPage({
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

  const { id } = await params;

  try {
    const invResult = await db.execute({
      sql: `SELECT inv.*,
            comp.name as company_name, comp.phone as company_phone, comp.address as company_address,
            comp.tax_number as company_tax_number, comp.commercial_registration as company_commercial_registration,
            c.name as customer_name, c.phone as customer_phone,
            s.name as supplier_name, s.phone as supplier_phone,
            ro.order_number, ro.vehicle_plate, ro.vehicle_model
            FROM invoices inv
            LEFT JOIN companies comp ON inv.company_id = comp.id
            LEFT JOIN customers c ON inv.customer_id = c.id
            LEFT JOIN suppliers s ON inv.supplier_id = s.id
            LEFT JOIN repair_orders ro ON inv.repair_order_id = ro.id
            WHERE inv.id = ? AND inv.company_id = ?`,
      args: [id, companyId],
    });

    if (invResult.rows.length === 0) notFound();

    const row = invResult.rows[0];
    const data = {
      id: String(row.id ?? ""),
      invoice_number: String(row.invoice_number ?? ""),
      type: String(row.type ?? ""),
      status: String(row.status ?? ""),
      is_return: Number(row.is_return ?? 0) === 1,
      original_invoice_id: row.original_invoice_id ? String(row.original_invoice_id) : null,
      subtotal: Number(row.subtotal ?? 0),
      discount: Number(row.discount ?? 0),
      tax: Number(row.tax ?? 0),
      digital_service_fee: Number(row.digital_service_fee ?? 0),
      total: Number(row.total ?? 0),
      paid_amount: Number(row.paid_amount ?? 0),
      company_name: row.company_name ? String(row.company_name) : null,
      company_phone: row.company_phone ? String(row.company_phone) : null,
      company_address: row.company_address ? String(row.company_address) : null,
      company_tax_number: row.company_tax_number ? String(row.company_tax_number) : null,
      company_commercial_registration: row.company_commercial_registration ? String(row.company_commercial_registration) : null,
      customer_name: row.customer_name ? String(row.customer_name) : null,
      customer_phone: row.customer_phone ? String(row.customer_phone) : null,
      supplier_name: row.supplier_name ? String(row.supplier_name) : null,
      supplier_phone: row.supplier_phone ? String(row.supplier_phone) : null,
      order_number: row.order_number ? String(row.order_number) : null,
      vehicle_plate: row.vehicle_plate ? String(row.vehicle_plate) : null,
      vehicle_model: row.vehicle_model ? String(row.vehicle_model) : null,
      repair_order_id: row.repair_order_id ? String(row.repair_order_id) : null,
      notes: row.notes ? String(row.notes) : null,
      created_at: String(row.created_at ?? ""),
    };

    const itemsResult = await db.execute({
      sql: `SELECT ii.*, i.name as item_name, i.unit as item_unit
            FROM invoice_items ii
            LEFT JOIN items i ON ii.item_id = i.id
            WHERE ii.invoice_id = ?
            ORDER BY ii.sort_order, ii.created_at`,
      args: [id],
    });

    const items = itemsResult.rows.map((r) => ({
      id: String(r.id ?? ""),
      item_id: r.item_id ? String(r.item_id) : null,
      item_name: r.item_name ? String(r.item_name) : (r.description ? String(r.description) : "صنف"),
      quantity: Number(r.quantity ?? 0),
      unit_price: Number(r.unit_price ?? 0),
      total: Number(r.total ?? 0),
    }));

    const paymentsResult = await db.execute({
      sql: `SELECT ip.*, pm.name as method_name FROM invoice_payments ip
            JOIN payment_methods pm ON ip.payment_method_id = pm.id
            WHERE ip.invoice_id = ? ORDER BY ip.created_at`,
      args: [id],
    });

    const payments = paymentsResult.rows.map((r) => ({
      id: String(r.id ?? ""),
      amount: Number(r.amount ?? 0),
      method_name: String(r.method_name ?? ""),
      reference_number: r.reference_number ? String(r.reference_number) : null,
      created_at: String(r.created_at ?? ""),
    }));

    const TYPE_LABELS: Record<string, string> = {
      sale: "بيع",
      purchase: "شراء",
      maintenance: "صيانة",
    };

    const STATUS_LABELS: Record<string, string> = {
      draft: "مسودة",
      pending: "معلقة",
      paid: "مدفوعة",
      partial: "مدفوعة جزئياً",
      returned: "مرتجع",
      cancelled: "ملغاة",
    };

    return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-2">
        <Link
          href="/admin/invoices"
          className="text-sm text-emerald-600 hover:text-emerald-700 no-print"
        >
          ← العودة للفواتير
        </Link>
        <div className="flex gap-2 no-print items-center flex-wrap">
          <PartialReturnButton invoiceId={id} type={data.type} status={data.status} items={items} />
          <ReturnButton invoiceId={id} type={data.type} status={data.status} />
          <CancelButton invoiceId={id} type={data.type} status={data.status} />
          <InvoiceActions
            invoiceNumber={data.invoice_number}
            invoiceType={data.type}
            total={data.total}
          />
        </div>
      </div>

      <div id="invoice-print-area">
      {data.company_name && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <h2 className="font-bold text-gray-900 mb-3 text-lg">بيانات الشركة</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-gray-500">اسم الشركة</dt>
              <dd className="font-medium text-gray-900">{data.company_name}</dd>
            </div>
            {data.company_phone && (
              <div>
                <dt className="text-gray-500">رقم الهاتف</dt>
                <dd className="text-gray-900">{data.company_phone}</dd>
              </div>
            )}
            {data.company_address && (
              <div>
                <dt className="text-gray-500">العنوان</dt>
                <dd className="text-gray-900">{data.company_address}</dd>
              </div>
            )}
            {data.company_tax_number && (
              <div>
                <dt className="text-gray-500">رقم البطاقة الضريبية</dt>
                <dd className="text-gray-900">{data.company_tax_number}</dd>
              </div>
            )}
            {data.company_commercial_registration && (
              <div>
                <dt className="text-gray-500">رقم السجل التجاري</dt>
                <dd className="text-gray-900">{data.company_commercial_registration}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">فاتورة {data.invoice_number}</h1>
        <p className="text-gray-500 mt-1">
          {data.is_return && (
            <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-sm font-medium mb-2">
              مرتجع
            </span>
          )}{" "}
          {TYPE_LABELS[data.type] || data.type} — {STATUS_LABELS[data.status] || data.status}
        </p>
        {data.is_return && data.original_invoice_id && (
          <Link
            href={`/admin/invoices/${data.original_invoice_id}`}
            className="text-sm text-emerald-600 hover:text-emerald-700 no-print"
          >
            ← عرض الفاتورة الأصلية
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 mb-4">بيانات الفاتورة</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">رقم الفاتورة</dt>
              <dd className="text-gray-900 font-medium">{data.invoice_number}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">النوع</dt>
              <dd className="text-gray-900">{TYPE_LABELS[data.type] || data.type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">الحالة</dt>
              <dd className="text-gray-900">{STATUS_LABELS[data.status] || data.status}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">التاريخ</dt>
              <dd className="text-gray-900">
                {new Date(data.created_at).toLocaleString("ar-EG")}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          {data.type === "purchase" ? (
            <>
              <h2 className="font-bold text-gray-900 mb-4">المورد</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">اسم المورد</dt>
                  <dd className="text-gray-900">{data.supplier_name || "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">هاتف المورد</dt>
                  <dd className="text-gray-900">{data.supplier_phone || "—"}</dd>
                </div>
              </dl>
            </>
          ) : (
            <>
              <h2 className="font-bold text-gray-900 mb-4">العميل / السيارة</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">العميل</dt>
                  <dd className="text-gray-900">{data.customer_name || "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">الهاتف</dt>
                  <dd className="text-gray-900">{data.customer_phone || "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">رقم اللوحة</dt>
                  <dd className="text-gray-900">{data.vehicle_plate || "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">الموديل</dt>
                  <dd className="text-gray-900">{data.vehicle_model || "—"}</dd>
                </div>
                {data.repair_order_id && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">أمر الإصلاح</dt>
                    <dd>
                      <Link
                        href={`/admin/workshop/${data.repair_order_id}`}
                        className="text-emerald-600 hover:text-emerald-700"
                      >
                        {data.order_number || "عرض"}
                      </Link>
                    </dd>
                  </div>
                )}
              </dl>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">بنود الفاتورة</h2>
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
                    <td className="px-4 py-3 text-sm">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm">{item.unit_price?.toFixed(2)} ج.م</td>
                    <td className="px-4 py-3 text-sm font-medium">{item.total?.toFixed(2)} ج.م</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={3} className="px-4 py-3 text-sm text-right">المجموع الفرعي</td>
                  <td className="px-4 py-3 text-sm font-medium">{data.subtotal?.toFixed(2)} ج.م</td>
                </tr>
                {data.discount > 0 && (
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="px-4 py-3 text-sm text-right">الخصم</td>
                    <td className="px-4 py-3 text-sm text-red-600">-{data.discount?.toFixed(2)} ج.م</td>
                  </tr>
                )}
                {data.tax > 0 && (
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="px-4 py-3 text-sm text-right">الضريبة</td>
                    <td className="px-4 py-3 text-sm">+{data.tax?.toFixed(2)} ج.م</td>
                  </tr>
                )}
                {data.digital_service_fee > 0 && (
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="px-4 py-3 text-sm text-right">الخدمة الرقمية</td>
                    <td className="px-4 py-3 text-sm">{data.digital_service_fee?.toFixed(2)} ج.م</td>
                  </tr>
                )}
                <tr className="bg-emerald-50 font-bold">
                  <td colSpan={3} className="px-4 py-3 text-sm text-right">الإجمالي النهائي</td>
                  <td className="px-4 py-3 text-sm text-emerald-700">{data.total?.toFixed(2)} ج.م</td>
                </tr>
                {data.paid_amount > 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-sm text-right">المدفوع</td>
                    <td className="px-4 py-3 text-sm">{data.paid_amount?.toFixed(2)} ج.م</td>
                  </tr>
                )}
              </tfoot>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500">لا توجد بنود</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="no-print">
          <AddPayment
            invoiceId={id}
            total={data.total}
            paidAmount={data.paid_amount}
            status={data.status}
          />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">سجل المدفوعات</h2>
          </div>
          <div className="p-4">
            {payments.length > 0 ? (
              <ul className="space-y-3">
                {payments.map((p) => (
                  <li key={p.id} className="flex justify-between items-center text-sm">
                    <span>{p.method_name} — {new Date(p.created_at).toLocaleString("ar-EG")}</span>
                    <span className="font-medium text-emerald-600">+{p.amount.toFixed(2)} ج.م</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">لا توجد مدفوعات مسجلة</p>
            )}
          </div>
        </div>
      </div>

      {data.notes && data.notes.trim() && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 mb-2">ملاحظات</h2>
          <p className="text-gray-600 text-sm whitespace-pre-wrap">{data.notes}</p>
        </div>
      )}

      <div className="mt-8 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
        <p className="font-medium text-gray-600">برمجة وتطوير البرنامج</p>
        <p className="mt-1">{DEVELOPER_INFO.name}</p>
        <p>هاتف: {DEVELOPER_INFO.phone}</p>
        {DEVELOPER_INFO.email && <p>البريد: {DEVELOPER_INFO.email}</p>}
      </div>
      </div>
    </div>
    );
  } catch {
    notFound();
  }
}

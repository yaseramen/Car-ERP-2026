"use client";

import { useState, useEffect } from "react";
import { addToQueue } from "@/lib/offline-queue";
import { getErrorMessage } from "@/lib/error-messages";
import { type BusinessType } from "@/lib/business-types";
import { WALLET_CHARGE_PHONE_ENTRIES } from "@/lib/wallet-charge-contact";

interface Company {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  business_type: string;
  marketplace_enabled: boolean;
  ads_globally_disabled: boolean;
  wallet_id: string | null;
  balance: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  company_name: string;
  performed_by_name: string | null;
  created_at: string;
}

const WALLET_TX_TYPE_LABELS: Record<string, string> = {
  credit: "شحن رصيد",
  debit: "خصم يدوي",
  digital_service: "خدمة رقمية",
  obd_search: "بحث OBD",
  assistant_company: "مساعد ذكاء (شركة)",
  assistant_obd_global: "مساعد ذكاء (OBD)",
  marketplace_ad: "إعلان السوق",
};

export function WalletsContent({ readOnly = false }: { readOnly?: boolean }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"charge" | "debit">("charge");
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeDesc, setChargeDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: "", phone: "", address: "" });
  const [feeSettings, setFeeSettings] = useState({ rate: "0.0001", minFee: "0.5" });
  const [feeSaving, setFeeSaving] = useState(false);
  const [customFeeOpen, setCustomFeeOpen] = useState(false);
  const [customFeeCompany, setCustomFeeCompany] = useState<Company | null>(null);
  const [customFeeForm, setCustomFeeForm] = useState({ rate: "", minFee: "" });
  const [companyActionOpen, setCompanyActionOpen] = useState(false);
  const [companyActionType, setCompanyActionType] = useState<"block" | "unblock" | "delete">("block");
  const [companyActionTarget, setCompanyActionTarget] = useState<Company | null>(null);
  const [companyActionSaving, setCompanyActionSaving] = useState(false);
  const [marketplaceSavingId, setMarketplaceSavingId] = useState<string | null>(null);
  const [businessTypeSavingId, setBusinessTypeSavingId] = useState<string | null>(null);

  async function fetchCompanies() {
    try {
      const res = await fetch("/api/admin/wallets/companies");
      if (res.ok) {
        const list = await res.json();
        setCompanies(
          (Array.isArray(list) ? list : []).map((c: Company & { business_type?: string }) => ({
            ...c,
            business_type: c.business_type ?? "both",
            marketplace_enabled: c.marketplace_enabled !== false,
            ads_globally_disabled: c.ads_globally_disabled === true,
          }))
        );
      }
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }

  async function patchCompanyFlags(
    companyId: string,
    body: Record<string, boolean | string>
  ): Promise<boolean> {
    setMarketplaceSavingId(companyId);
    try {
      const res = await fetch(`/api/admin/super/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "فشل التحديث");
        return false;
      }
      await fetchCompanies();
      return true;
    } catch {
      alert("فشل الاتصال");
      return false;
    } finally {
      setMarketplaceSavingId(null);
    }
  }

  async function setCompanyBusinessType(companyId: string, business_type: BusinessType) {
    setBusinessTypeSavingId(companyId);
    try {
      const res = await fetch(`/api/admin/super/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_type }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "فشل التحديث");
        return;
      }
      await fetchCompanies();
    } catch {
      alert("فشل الاتصال");
    } finally {
      setBusinessTypeSavingId(null);
    }
  }

  async function fetchFeeSettings() {
    try {
      const res = await fetch("/api/admin/settings/digital-fee");
      if (res.ok) {
        const d = await res.json();
        setFeeSettings({ rate: String(d.rate ?? "0.0001"), minFee: String(d.minFee ?? "0.5") });
      }
    } catch {}
  }

  async function fetchTransactions() {
    try {
      const res = await fetch("/api/admin/wallets/transactions");
      if (res.ok) setTransactions(await res.json());
    } catch {
      setTransactions([]);
    }
  }

  useEffect(() => {
    fetchCompanies();
    fetchTransactions();
    if (!readOnly) fetchFeeSettings();
  }, [readOnly]);

  useEffect(() => {
    const handleOnline = () => {
      fetchCompanies();
      fetchTransactions();
      if (!readOnly) fetchFeeSettings();
    };
    window.addEventListener("alameen-online", handleOnline);
    return () => window.removeEventListener("alameen-online", handleOnline);
  }, [readOnly]);

  async function handleWalletAction(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCompany) return;

    const payload = {
      company_id: selectedCompany.id,
      amount: Number(chargeAmount),
      description: chargeDesc.trim() || undefined,
    };

    setSaving(true);
    try {
      if (!navigator.onLine) {
        addToQueue(modalType === "charge" ? { type: "wallet_charge", data: payload } : { type: "wallet_debit", data: payload });
        setModalOpen(false);
        setSelectedCompany(null);
        setChargeAmount("");
        setChargeDesc("");
        alert("انقطع الاتصال. تم حفظ العملية محلياً. سيتم تنفيذها تلقائياً عند عودة الإنترنت.");
        return;
      }

      const endpoint = modalType === "charge" ? "/api/admin/wallets/charge" : "/api/admin/wallets/debit";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || (modalType === "charge" ? "فشل في الشحن" : "فشل في الخصم"));
        return;
      }

      setModalOpen(false);
      setSelectedCompany(null);
      setChargeAmount("");
      setChargeDesc("");
      fetchCompanies();
      fetchTransactions();
    } catch {
      if (!navigator.onLine) {
        addToQueue(modalType === "charge" ? { type: "wallet_charge", data: payload } : { type: "wallet_debit", data: payload });
        setModalOpen(false);
        setSelectedCompany(null);
        setChargeAmount("");
        setChargeDesc("");
        alert("انقطع الاتصال. تم حفظ العملية محلياً. سيتم تنفيذها تلقائياً عند عودة الإنترنت.");
      } else {
        alert("حدث خطأ");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleCompanyAction() {
    if (!companyActionTarget) return;
    setCompanyActionSaving(true);
    try {
      if (companyActionType === "delete") {
        const ok = confirm(`هل أنت متأكد من حذف "${companyActionTarget.name}" وكل بياناتها؟ يمكن للأعضاء إعادة التسجيل لاحقاً.`);
        if (!ok) {
          setCompanyActionSaving(false);
          return;
        }
        const res = await fetch(`/api/admin/super/companies/${companyActionTarget.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || "فشل في الحذف");
          return;
        }
        setCompanyActionOpen(false);
        setCompanyActionTarget(null);
        fetchCompanies();
        fetchTransactions();
      } else {
        const res = await fetch(`/api/admin/super/companies/${companyActionTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: companyActionType === "unblock" ? true : false }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || "فشل في التعديل");
          return;
        }
        setCompanyActionOpen(false);
        setCompanyActionTarget(null);
        fetchCompanies();
      }
    } catch {
      alert("حدث خطأ");
    } finally {
      setCompanyActionSaving(false);
    }
  }

  async function handleAddCompany(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: newCompany.name.trim(),
      phone: newCompany.phone.trim() || undefined,
      address: newCompany.address.trim() || undefined,
    };
    setSaving(true);
    try {
      if (!navigator.onLine) {
        addToQueue({ type: "add_company", data: payload });
        setAddCompanyOpen(false);
        setNewCompany({ name: "", phone: "", address: "" });
        alert("انقطع الاتصال. تم حفظ الشركة محلياً. سيتم إضافتها تلقائياً عند عودة الإنترنت.");
        return;
      }
      const res = await fetch("/api/admin/wallets/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "فشل في الإنشاء");
        return;
      }

      const company = await res.json();
      setCompanies((prev) => [company, ...prev]);
      setAddCompanyOpen(false);
      setNewCompany({ name: "", phone: "", address: "" });
    } catch {
      if (!navigator.onLine) {
        addToQueue({ type: "add_company", data: payload });
        setAddCompanyOpen(false);
        setNewCompany({ name: "", phone: "", address: "" });
        alert("انقطع الاتصال. تم حفظ الشركة محلياً. سيتم إضافتها تلقائياً عند عودة الإنترنت.");
      } else {
        alert("حدث خطأ");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveFeeSettings(e: React.FormEvent) {
    e.preventDefault();
    setFeeSaving(true);
    try {
      const res = await fetch("/api/admin/settings/digital-fee", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate: feeSettings.rate, minFee: feeSettings.minFee }),
      });
      if (res.ok) alert("تم حفظ الإعدادات");
      else alert((await res.json()).error || "فشل");
    } catch (err) {
      alert(getErrorMessage(err, "حدث خطأ"));
    } finally {
      setFeeSaving(false);
    }
  }

  async function handleSaveCustomFee(e: React.FormEvent) {
    e.preventDefault();
    if (!customFeeCompany) return;
    setFeeSaving(true);
    try {
      const res = await fetch(`/api/admin/companies/${customFeeCompany.id}/digital-fee`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rate: customFeeForm.rate ? parseFloat(customFeeForm.rate) : undefined,
          minFee: customFeeForm.minFee ? parseFloat(customFeeForm.minFee) : undefined,
        }),
      });
      if (res.ok) {
        setCustomFeeOpen(false);
        setCustomFeeCompany(null);
        setCustomFeeForm({ rate: "", minFee: "" });
      } else alert((await res.json()).error || "فشل");
    } catch (err) {
      alert(getErrorMessage(err, "حدث خطأ"));
    } finally {
      setFeeSaving(false);
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

  if (readOnly) {
    const mine = companies[0];
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/30 px-4 py-4 text-sm text-emerald-900 dark:text-emerald-100">
          <strong>محفظة الاستخدام:</strong> تُخصم منها تلقائياً رسوم الخدمات الرقمية، وبحث OBD، وإعلانات السوق عند الاشتراك. شحن الرصيد يتم عبر إدارة المنصة — استخدم أرقام التواصل بجوار الرصيد أدناه.
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="font-medium text-gray-900 dark:text-gray-100 mb-2">رصيد المحفظة</h2>
              {!mine ? (
                <p className="text-amber-600 dark:text-amber-400">
                  تعذر تحميل بيانات المحفظة. حاول تحديث الصفحة أو التواصل مع الدعم.
                </p>
              ) : (
                <>
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {mine.balance.toFixed(2)}{" "}
                    <span className="text-lg font-semibold text-gray-600 dark:text-gray-400">ج.م</span>
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{mine.name}</p>
                </>
              )}
            </div>
            <div className="shrink-0 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 text-sm w-full sm:w-auto sm:min-w-[14rem]">
              <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">لشحن الرصيد — تواصل</p>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                {WALLET_CHARGE_PHONE_ENTRIES.map((e) => (
                  <li key={e.display} className="flex flex-wrap items-center gap-2">
                    <a
                      href={e.tel}
                      className="font-mono text-base font-semibold text-emerald-700 dark:text-emerald-400 hover:underline tabular-nums"
                    >
                      {e.display}
                    </a>
                    <span className="text-gray-400 dark:text-gray-500">|</span>
                    <a
                      href={e.wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                    >
                      واتساب
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-medium text-gray-900 dark:text-gray-100">سجل العمليات</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">آخر العمليات على محفظة شركتك</p>
          </div>
          <div className="overflow-x-auto">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">لا توجد عمليات مسجلة بعد</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">التاريخ</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">النوع</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">المبلغ</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الوصف</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">بواسطة</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const isCredit = tx.type === "credit";
                    const typeLabel = WALLET_TX_TYPE_LABELS[tx.type] ?? tx.type;
                    return (
                      <tr key={tx.id} className="border-b border-gray-50 dark:border-gray-700">
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {new Date(tx.created_at).toLocaleString("ar-EG")}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{typeLabel}</td>
                        <td className={`px-4 py-3 text-sm font-medium ${isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                          {isCredit ? "+" : "-"}
                          {tx.amount.toFixed(2)} ج.م
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{tx.description || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{tx.performed_by_name || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="font-medium text-gray-900 dark:text-gray-100 mb-4">النسبة الافتراضية للخدمة الرقمية</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          تُطبّق على فواتير البيع والصيانة. المعدل كنسبة عشرية (مثلاً 0.0001 = 0.01%). الحد الأدنى بالجنيه.
        </p>
        <form onSubmit={handleSaveFeeSettings} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المعدل (نسبة)</label>
            <input
              type="text"
              value={feeSettings.rate}
              onChange={(e) => setFeeSettings((f) => ({ ...f, rate: e.target.value }))}
              placeholder="0.0001"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الحد الأدنى (ج.م)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={feeSettings.minFee}
              onChange={(e) => setFeeSettings((f) => ({ ...f, minFee: e.target.value }))}
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={feeSaving} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-50">
            {feeSaving ? "جاري الحفظ..." : "حفظ الافتراضي"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/80 dark:bg-sky-950/30 px-4 py-3 text-sm text-sky-900 dark:text-sky-100">
        <strong>السوق والإعلانات (تجريبي):</strong> عمود «السوق» يتحكم في تفعيل ميزات السوق لاحقاً وإيقاف ظهور إعلانات الشركة عالمياً.
        شركات «مورّد» الجديدة تُسجَّل مع السوق معطّل حتى تفعّله السوبر أدمن بعد المراجعة.
      </div>

      <div className="flex justify-between items-center">
        <h2 className="font-medium text-gray-900 dark:text-gray-100">الشركات والمحافظ</h2>
        <button
          onClick={() => setAddCompanyOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          إضافة شركة
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-600">
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الشركة</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">نوع النشاط</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">السوق</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الحالة</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الهاتف</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الرصيد</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">إجراءات</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">تخصيص</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    لا توجد شركات. اضغط «إضافة شركة» للبدء.
                  </td>
                </tr>
              ) : (
                companies.map((c) => (
                  <tr key={c.id} className={`border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 ${!c.is_active ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{c.name}</td>
                    <td className="px-4 py-3">
                      <select
                        value={c.business_type}
                        onChange={(e) =>
                          setCompanyBusinessType(c.id, e.target.value as BusinessType)
                        }
                        disabled={businessTypeSavingId === c.id}
                        className="max-w-[11rem] text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5"
                        title="نوع النشاط"
                      >
                        <option value="both">بيع + خدمة</option>
                        <option value="sales_only">قطع غيار فقط</option>
                        <option value="service_only">خدمة فقط</option>
                        <option value="supplier">مورّد</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5 text-xs">
                        <button
                          type="button"
                          disabled={marketplaceSavingId === c.id}
                          onClick={() =>
                            void patchCompanyFlags(c.id, { marketplace_enabled: !c.marketplace_enabled })
                          }
                          className={`px-2 py-1 rounded text-right font-medium ${
                            c.marketplace_enabled
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                              : "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200"
                          }`}
                          title="تفعيل أو تعطيل ميزات السوق للشركة"
                        >
                          {c.marketplace_enabled ? "السوق: مفعّل" : "السوق: معطّل"}
                        </button>
                        <button
                          type="button"
                          disabled={marketplaceSavingId === c.id}
                          onClick={() =>
                            void patchCompanyFlags(c.id, { ads_globally_disabled: !c.ads_globally_disabled })
                          }
                          className={`px-2 py-1 rounded text-right font-medium ${
                            c.ads_globally_disabled
                              ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                          }`}
                          title="إخفاء كل إعلانات الشركة من السوق فوراً"
                        >
                          {c.ads_globally_disabled ? "إعلانات: موقوفة" : "إعلانات: مسموحة"}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded ${c.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                        {c.is_active ? "نشطة" : "محظورة"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{c.phone || "—"}</td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {c.balance.toFixed(2)} ج.م
                    </td>
                    <td className="px-4 py-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setSelectedCompany(c);
                          setModalType("charge");
                          setModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition"
                      >
                        شحن
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCompany(c);
                          setModalType("debit");
                          setModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg transition"
                      >
                        خصم
                      </button>
                      <button
                        onClick={() => {
                          setCustomFeeCompany(c);
                          setCustomFeeForm({ rate: "", minFee: "" });
                          setCustomFeeOpen(true);
                        }}
                        className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg transition"
                        title="تخصيص نسبة الخدمة الرقمية"
                      >
                        نسبة
                      </button>
                      <button
                        onClick={() => {
                          setCompanyActionTarget(c);
                          setCompanyActionType(c.is_active ? "block" : "unblock");
                          setCompanyActionOpen(true);
                        }}
                        className={`px-3 py-1.5 text-sm rounded-lg transition ${c.is_active ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white`}
                        title={c.is_active ? "حظر الشركة" : "إلغاء الحظر"}
                      >
                        {c.is_active ? "حظر" : "إلغاء حظر"}
                      </button>
                      <button
                        onClick={() => {
                          setCompanyActionTarget(c);
                          setCompanyActionType("delete");
                          setCompanyActionOpen(true);
                        }}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition"
                        title="حذف الشركة وجميع بياناتها"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-medium text-gray-900 dark:text-gray-100">آخر المعاملات</h2>
        </div>
        <div className="overflow-x-auto">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">لا توجد معاملات</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">التاريخ</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الشركة</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">المبلغ</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">الوصف</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">بواسطة</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-50 dark:border-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {new Date(tx.created_at).toLocaleString("ar-EG")}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{tx.company_name}</td>
                    <td className={`px-4 py-3 text-sm font-medium ${tx.type === "credit" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {tx.type === "credit" ? "+" : "-"}{tx.amount.toFixed(2)} ج.م
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{tx.description || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{tx.performed_by_name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {modalType === "charge" ? "شحن" : "خصم"} محفظة: {selectedCompany.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">الرصيد الحالي: {selectedCompany.balance.toFixed(2)} ج.م</p>
              {modalType === "debit" && (
                <p className="text-xs text-amber-600 mt-1">لتصحيح إضافة رصيد بالخطأ</p>
              )}
            </div>
            <form onSubmit={handleWalletAction} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المبلغ (ج.م) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={modalType === "debit" ? selectedCompany.balance : undefined}
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="0.00"
                />
                {modalType === "debit" && (
                  <p className="text-xs text-gray-500 mt-1">الحد الأقصى: {selectedCompany.balance.toFixed(2)} ج.م</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف (اختياري)</label>
                <input
                  type="text"
                  value={chargeDesc}
                  onChange={(e) => setChargeDesc(e.target.value)}
                  className={inputClass}
                  placeholder={modalType === "charge" ? "مثال: شحن رصيد" : "مثال: تصحيح إضافة بالخطأ"}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setSelectedCompany(null);
                  }}
                  className="flex-1 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving || (modalType === "debit" && Number(chargeAmount) > selectedCompany.balance)}
                  className={`flex-1 px-4 py-2.5 disabled:opacity-50 text-white font-medium rounded-lg transition-colors ${
                    modalType === "charge"
                      ? "bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400"
                      : "bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400"
                  }`}
                >
                  {saving ? "جاري..." : modalType === "charge" ? "شحن" : "خصم"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {customFeeOpen && customFeeCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">تخصيص نسبة الخدمة الرقمية: {customFeeCompany.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">اترك الحقل فارغاً لاستخدام القيمة الافتراضية</p>
            </div>
            <form onSubmit={handleSaveCustomFee} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المعدل (نسبة عشرية)</label>
                <input
                  type="text"
                  value={customFeeForm.rate}
                  onChange={(e) => setCustomFeeForm((f) => ({ ...f, rate: e.target.value }))}
                  placeholder={feeSettings.rate}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الحد الأدنى (ج.م)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={customFeeForm.minFee}
                  onChange={(e) => setCustomFeeForm((f) => ({ ...f, minFee: e.target.value }))}
                  placeholder={feeSettings.minFee}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-wrap gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setCustomFeeOpen(false);
                    setCustomFeeCompany(null);
                    setCustomFeeForm({ rate: "", minFee: "" });
                  }}
                  className="px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!customFeeCompany) return;
                    setFeeSaving(true);
                    try {
                      const res = await fetch(`/api/admin/companies/${customFeeCompany.id}/digital-fee`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ clear: true }),
                      });
                      if (res.ok) {
                        setCustomFeeOpen(false);
                        setCustomFeeCompany(null);
                      }
                    } finally {
                      setFeeSaving(false);
                    }
                  }}
                  disabled={feeSaving}
                  className="px-4 py-2.5 text-amber-600 hover:bg-amber-50 rounded-lg transition disabled:opacity-50"
                >
                  إلغاء التخصيص
                </button>
                <button
                  type="submit"
                  disabled={feeSaving}
                  className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg disabled:opacity-50"
                >
                  {feeSaving ? "جاري..." : "حفظ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {companyActionOpen && companyActionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {companyActionType === "delete" && `حذف: ${companyActionTarget.name}`}
                {companyActionType === "block" && `حظر: ${companyActionTarget.name}`}
                {companyActionType === "unblock" && `إلغاء حظر: ${companyActionTarget.name}`}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {companyActionType === "delete" && "سيتم حذف الشركة وجميع بياناتها (عملاء، فواتير، مخزون...). يمكن للأعضاء إعادة التسجيل."}
                {companyActionType === "block" && "لن يتمكن المستخدمون من الدخول حتى إلغاء الحظر."}
                {companyActionType === "unblock" && "سيتمكن المستخدمون من الدخول مرة أخرى."}
              </p>
            </div>
            <div className="p-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setCompanyActionOpen(false);
                  setCompanyActionTarget(null);
                }}
                className="flex-1 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleCompanyAction}
                disabled={companyActionSaving}
                className={`flex-1 px-4 py-2.5 text-white font-medium rounded-lg transition-colors disabled:opacity-50 ${
                  companyActionType === "delete" ? "bg-red-600 hover:bg-red-700" : companyActionType === "block" ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {companyActionSaving ? "جاري..." : companyActionType === "delete" ? "حذف" : companyActionType === "block" ? "حظر" : "إلغاء حظر"}
              </button>
            </div>
          </div>
        </div>
      )}

      {addCompanyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">إضافة شركة جديدة</h3>
            </div>
            <form onSubmit={handleAddCompany} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم الشركة *</label>
                <input
                  type="text"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany((c) => ({ ...c, name: e.target.value }))}
                  required
                  className={inputClass}
                  placeholder="اسم المركز أو الشركة"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الهاتف</label>
                <input
                  type="text"
                  value={newCompany.phone}
                  onChange={(e) => setNewCompany((c) => ({ ...c, phone: e.target.value }))}
                  className={inputClass}
                  placeholder="01009376052"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العنوان</label>
                <input
                  type="text"
                  value={newCompany.address}
                  onChange={(e) => setNewCompany((c) => ({ ...c, address: e.target.value }))}
                  className={inputClass}
                  placeholder="عنوان المركز"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setAddCompanyOpen(false)}
                  className="flex-1 px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium rounded-lg transition-colors"
                >
                  {saving ? "جاري الحفظ..." : "إضافة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

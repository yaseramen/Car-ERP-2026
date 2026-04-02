"use client";

import { useEffect, useState, useMemo } from "react";

type PaymentWalletRow = {
  id: string;
  name: string;
  balance: number;
  payment_channel: string;
  phone_digits: string;
};

function normPhone(s: string): string {
  return s.replace(/\D/g, "");
}

type Props = {
  paymentChannel: "vodafone_cash" | "instapay";
  referenceFrom: string;
  referenceTo: string;
  onReferenceFromChange: (v: string) => void;
  onReferenceToChange: (v: string) => void;
  defaultReferenceFromHint?: string | null;
  inputClass: string;
};

/**
 * «المحول منه»: رقم المرسل/العميل فقط (يدوي أو مُقترح من الفاتورة) — ليست محفظة استلام الشركة.
 * «المحول إليه»: محافظ استلام الشركة المسجّلة لنفس القناة أو رقم جديد.
 */
export function DigitalWalletPaymentFields({
  paymentChannel,
  referenceFrom,
  referenceTo,
  onReferenceFromChange,
  onReferenceToChange,
  defaultReferenceFromHint,
  inputClass,
}: Props) {
  const [wallets, setWallets] = useState<PaymentWalletRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/treasuries")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        if (cancelled) return;
        const arr = Array.isArray(data) ? data : [];
        const list: PaymentWalletRow[] = [];
        for (const r of arr) {
          const row = r as {
            is_payment_wallet?: boolean;
            payment_channel?: string;
            phone_digits?: string;
            id?: string;
            name?: string;
            balance?: number;
          };
          if (row.is_payment_wallet && row.payment_channel === paymentChannel && row.phone_digits) {
            list.push({
              id: String(row.id),
              name: String(row.name ?? ""),
              balance: Number(row.balance ?? 0),
              payment_channel: String(row.payment_channel),
              phone_digits: String(row.phone_digits),
            });
          }
        }
        setWallets(list);
        setLoadErr(null);
      })
      .catch(() => {
        if (!cancelled) {
          setWallets([]);
          setLoadErr("تعذر جلب محافظ الاستلام");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [paymentChannel]);

  const toPick = useMemo(() => {
    const t = normPhone(referenceTo);
    if (!t) return "";
    const hit = wallets.find((w) => normPhone(w.phone_digits) === t);
    return hit ? hit.phone_digits : "__other__";
  }, [referenceTo, wallets]);

  const hint = (defaultReferenceFromHint ?? "").trim();

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          رقم الهاتف أو الحساب المحول منه <span className="text-gray-400 font-normal">(اختياري)</span>
        </label>
        <input
          type="text"
          value={referenceFrom}
          onChange={(e) => onReferenceFromChange(e.target.value)}
          className={inputClass}
          placeholder="رقم هاتف أو حساب العميل الذي حوّل منه"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
          يُسجَّل كمرجع فقط (من دفع العميل). محافظ استلام الشركة تُختار في الحقل أدناه «المحول إليه».
        </p>
        {hint && referenceFrom.trim() === hint && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            مُقترح تلقائياً من هاتف العميل على الفاتورة — يمكنك تعديله.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          رقم المحفظة أو الحساب المحول إليه *
        </label>
        {wallets.length > 0 && (
          <select
            value={toPick === "__other__" && referenceTo.trim() ? "__other__" : toPick}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "" || v === "__other__") onReferenceToChange("");
              else onReferenceToChange(v);
            }}
            className={`${inputClass} mb-2`}
          >
            <option value="">— اختر محفظة استلام الشركة —</option>
            {wallets.map((w) => (
              <option key={`t-${w.id}`} value={w.phone_digits}>
                {w.name} — {w.phone_digits} (رصيد {w.balance.toFixed(2)} ج.م)
              </option>
            ))}
            <option value="__other__">رقم جديد (يُنشأ سجل استلام)…</option>
          </select>
        )}
        <input
          type="text"
          value={referenceTo}
          onChange={(e) => onReferenceToChange(e.target.value)}
          required
          className={inputClass}
          placeholder={
            wallets.length > 0
              ? "أو اكتب الرقم يدوياً إن لم يكن في القائمة"
              : "رقم محفظة الشركة (يُنشأ سجل استلام تلقائياً إن لم يكن موجوداً)"
          }
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
          القائمة من «الخزائن» — محافظ الاستلام المطابقة لطريقة الدفع. اخترها لتفادي أخطاء الرقم.
        </p>
        {loadErr && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{loadErr}</p>}
      </div>
    </>
  );
}

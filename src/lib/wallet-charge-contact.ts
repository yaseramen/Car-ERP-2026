/** نص موحّد لرسائل شحن المحفظة — يظهر في حظر الواجهة وفي أخطاء الـ API */
export const WALLET_CHARGE_PHONES_DISPLAY = "01009376052 · 01556660502";

export const WALLET_CHARGE_MESSAGE =
  "يجب شحن المحفظة للمتابعة. للتواصل: 01009376052 أو 01556660502";

export function walletInsufficientError(required: number, available: number): string {
  return `رصيد المحفظة غير كافٍ (مطلوب ${required.toFixed(2)} ج.م — متاح ${available.toFixed(2)} ج.م). ${WALLET_CHARGE_MESSAGE}`;
}

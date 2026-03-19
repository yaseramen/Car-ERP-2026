"use client";

import { useState } from "react";
import { addToQueue } from "@/lib/offline-queue";

export function FeedbackContent({ isSuperAdmin }: { isSuperAdmin?: boolean }) {
  const [type, setType] = useState<string>("suggestion");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    try {
      const payload = { type, subject: subject.trim(), message: message.trim() };
      if (!navigator.onLine) {
        addToQueue({ type: "submit_feedback", data: payload });
        setSent(true);
        setSubject("");
        setMessage("");
        alert("انقطع الاتصال. تم حفظ الملاحظة. سيتم إرسالها تلقائياً عند عودة الإنترنت.");
        return;
      }
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSent(true);
        setSubject("");
        setMessage("");
      } else {
        const err = await res.json();
        alert(err.error || "فشل في الإرسال");
      }
    } catch {
      if (!navigator.onLine) {
        addToQueue({ type: "submit_feedback", data: { type, subject: subject.trim(), message: message.trim() } });
        setSent(true);
        setSubject("");
        setMessage("");
        alert("انقطع الاتصال. تم حفظ الملاحظة. سيتم إرسالها تلقائياً عند عودة الإنترنت.");
      } else {
        alert("حدث خطأ. حاول مرة أخرى.");
      }
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
        <p className="text-emerald-600 dark:text-emerald-400 font-medium mb-2">تم إرسال ملاحظتك بنجاح</p>
        <p className="text-gray-600 dark:text-gray-400 text-sm">شكراً لك. المطور سيراجعها ويتعامل معها.</p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-4 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          إرسال ملاحظة أخرى
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع الملاحظة</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="suggestion">اقتراح تطوير</option>
            <option value="bug">الإبلاغ عن خطأ</option>
            <option value="other">أخرى</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الموضوع *</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            placeholder="موضوع الملاحظة"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الملاحظة *</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={5}
            placeholder="اكتب ملاحظتك أو وصف الخطأ..."
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium rounded-lg transition-colors"
        >
          {sending ? "جاري الإرسال..." : "إرسال"}
        </button>
      </form>
    </div>
  );
}

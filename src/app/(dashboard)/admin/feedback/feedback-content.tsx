"use client";

import { useState, useEffect } from "react";

const TYPE_LABELS: Record<string, string> = {
  feedback: "ملاحظة عامة",
  feature: "اقتراح تعديل/ميزة",
  bug: "إبلاغ عن خطأ",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار",
  read: "تمت القراءة",
  resolved: "تم التعامل معها",
};

type FeedbackItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  status: string;
  created_at: string;
  user_name: string;
  user_email: string;
  company_name: string;
};

export function FeedbackContent({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [type, setType] = useState<"feedback" | "feature" | "bug">("feedback");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "read" | "resolved">("all");

  const loadItems = () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    fetch("/api/admin/feedback")
      .then((r) => r.json())
      .then((d) => (Array.isArray(d) ? setItems(d) : setItems([])))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadItems();
  }, [isSuperAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "فشل الإرسال");
        return;
      }
      setSent(true);
      setTitle("");
      setMessage("");
      if (isSuperAdmin) loadItems();
    } catch {
      setError("حدث خطأ. حاول مرة أخرى.");
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/admin/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    }
  };

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  return (
    <div className="space-y-8">
      {/* نموذج الإرسال */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
        <h2 className="font-bold text-gray-900 mb-4">إرسال ملاحظة أو إبلاغ</h2>
        {sent && (
          <div className="mb-4 p-4 bg-emerald-50 text-emerald-800 rounded-lg text-sm">
            تم إرسال ملاحظتك بنجاح. شكراً لك.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">النوع</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "feedback" | "feature" | "bug")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="feedback">ملاحظة عامة</option>
              <option value="feature">اقتراح تعديل أو ميزة جديدة</option>
              <option value="bug">إبلاغ عن خطأ</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">العنوان *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="مثال: خطأ في طباعة الفاتورة"
              maxLength={200}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">التفاصيل *</label>
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg min-h-[120px]"
              placeholder="اشرح ملاحظتك أو الخطأ أو اقتراحك بالتفصيل..."
              maxLength={5000}
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={sending}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {sending ? "جاري الإرسال..." : "إرسال"}
          </button>
        </form>
      </div>

      {/* قائمة الملاحظات للمطور */}
      {isSuperAdmin && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <h2 className="font-bold text-gray-900 p-4 border-b border-gray-100">الملاحظات الواردة</h2>
          <div className="p-4 border-b border-gray-100 flex gap-2">
            {(["all", "pending", "read", "resolved"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm ${
                  filter === f ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {f === "all" ? "الكل" : STATUS_LABELS[f]}
              </button>
            ))}
          </div>
          {loading ? (
            <p className="p-8 text-gray-500 text-center">جاري التحميل...</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-gray-500 text-center">لا توجد ملاحظات</p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {filtered.map((item) => (
                <div key={item.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                          {TYPE_LABELS[item.type]}
                        </span>
                        <span className="text-xs text-gray-500">
                          {item.company_name} — {item.user_name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(item.created_at).toLocaleDateString("ar-EG", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900">{item.title}</h3>
                      <p className="text-gray-600 text-sm mt-1 whitespace-pre-wrap">{item.message}</p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <select
                        value={item.status}
                        onChange={(e) => updateStatus(item.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="pending">قيد الانتظار</option>
                        <option value="read">تمت القراءة</option>
                        <option value="resolved">تم التعامل معها</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

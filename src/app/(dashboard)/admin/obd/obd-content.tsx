"use client";

import { useState } from "react";

export function ObdContent() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    code: string;
    description_ar: string | null;
    description_en: string | null;
    causes: string | null;
    solutions: string | null;
    symptoms: string | null;
    source: string;
    cost: number;
  } | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/obd/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "فشل في البحث");
        return;
      }

      setResult(data);
    } catch {
      alert("حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none";

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="مثال: P0100 أو P0171"
            className={inputClass}
            dir="ltr"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? "جاري البحث..." : "بحث"}
          </button>
        </form>
        <p className="text-sm text-gray-500 mt-2">
          تكلفة كل بحث: 1 ج.م (تُخصم من محفظة الشركة)
        </p>
      </div>

      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-bold text-gray-900">نتيجة البحث — {result.code}</h2>
            <span className="text-sm text-gray-500">
              المصدر: {result.source === "local" ? "محلي" : result.source === "ai" ? "ذكاء اصطناعي" : "غير موجود"} — {result.cost} ج.م
            </span>
          </div>
          <div className="p-6 space-y-6">
            {result.description_ar && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">الوصف</h3>
                <p className="text-gray-900">{result.description_ar}</p>
              </div>
            )}
            {result.causes && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">الأسباب المحتملة</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-900">
                  {result.causes.split("|").map((c, i) => (
                    <li key={i}>{c.trim()}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.solutions && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">الحلول المقترحة</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-900">
                  {result.solutions.split("|").map((s, i) => (
                    <li key={i}>{s.trim()}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.symptoms && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">الأعراض</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-900">
                  {result.symptoms.split("|").map((s, i) => (
                    <li key={i}>{s.trim()}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

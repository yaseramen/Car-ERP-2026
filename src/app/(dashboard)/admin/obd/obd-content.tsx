"use client";

import { useState, useRef } from "react";

type ObdResult = {
  code: string;
  description_ar: string | null;
  description_en: string | null;
  causes: string | null;
  solutions: string | null;
  symptoms: string | null;
  source: string;
  cost: number;
};

export function ObdContent() {
  const [mode, setMode] = useState<"search" | "upload">("search");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ObdResult | null>(null);
  const [analyzeResults, setAnalyzeResults] = useState<{
    results: ObdResult[];
    totalCost: number;
    codesFound: number;
  } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setResult(null);
    setAnalyzeResults(null);
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

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult(null);
    setAnalyzeResults(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/obd/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "فشل في تحليل الملف");
        return;
      }

      setAnalyzeResults(data);
    } catch {
      alert("حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none";

  function ResultCard({ r }: { r: ObdResult }) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-bold text-gray-900">كود {r.code}</h2>
          <span className="text-sm text-gray-500">
            المصدر: {r.source === "local" ? "محلي" : r.source === "ai" ? "ذكاء اصطناعي" : "غير موجود"} — {r.cost} ج.م
          </span>
        </div>
        <div className="p-6 space-y-6">
          {r.description_ar && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">الوصف</h3>
              <p className="text-gray-900">{r.description_ar}</p>
            </div>
          )}
          {r.causes && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">الأسباب المحتملة</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-900">
                {r.causes.split("|").map((c, i) => (
                  <li key={i}>{c.trim()}</li>
                ))}
              </ul>
            </div>
          )}
          {r.solutions && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">الحلول المقترحة</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-900">
                {r.solutions.split("|").map((s, i) => (
                  <li key={i}>{s.trim()}</li>
                ))}
              </ul>
            </div>
          )}
          {r.symptoms && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">الأعراض</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-900">
                {r.symptoms.split("|").map((s, i) => (
                  <li key={i}>{s.trim()}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => setMode("search")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "search" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          بحث بكود واحد
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "upload" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          رفع تقرير (PDF أو صورة)
        </button>
      </div>

      {mode === "search" && (
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
      )}

      {mode === "upload" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f && (f.type.startsWith("image/") || f.type === "application/pdf")) {
                  setFile(f);
                } else {
                  alert("يرجى رفع صورة (JPG, PNG, WebP) أو ملف PDF");
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragOver ? "border-emerald-500 bg-emerald-50" : "border-gray-300 hover:border-emerald-400"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                }}
              />
              <p className="text-gray-600">
                {file ? (
                  <span className="font-medium text-emerald-600">{file.name}</span>
                ) : (
                  <>اسحب الملف هنا أو انقر للاختيار — PDF أو صورة (حد أقصى 4 ميجابايت)</>
                )}
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || !file}
              className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {loading ? "جاري التحليل..." : "تحليل التقرير"}
            </button>
            <p className="text-sm text-gray-500">
              تكلفة كل كود: 1 ج.م — سيتم استخراج كل الأكواد من التقرير وتحليلها
            </p>
          </form>
        </div>
      )}

      {result && <ResultCard r={result} />}

      {analyzeResults && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-emerald-50 rounded-lg px-4 py-3">
            <span className="font-medium text-gray-900">
              تم العثور على {analyzeResults.codesFound} كود — إجمالي التكلفة: {analyzeResults.totalCost} ج.م
            </span>
          </div>
          <div className="space-y-4">
            {analyzeResults.results.map((r, i) => (
              <ResultCard key={i} r={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

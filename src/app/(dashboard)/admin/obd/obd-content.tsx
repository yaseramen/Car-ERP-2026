"use client";

import { useState, useRef, useEffect } from "react";

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
  const [mode, setMode] = useState<"search" | "upload" | "manage">("search");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ aiAvailable: boolean; message: string; providers?: string[] } | null>(null);
  const [result, setResult] = useState<ObdResult | null>(null);
  const [analyzeResults, setAnalyzeResults] = useState<{
    results: ObdResult[];
    totalCost: number;
    codesFound: number;
    vehicle?: { brand: string; model: string; year: number | null; vin: string };
  } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/obd/status")
      .then((r) => r.json())
      .then((d) => setAiStatus({ aiAvailable: d.aiAvailable, message: d.message, providers: d.providers }))
      .catch(() => setAiStatus({ aiAvailable: false, message: "تعذر التحقق" }));
  }, []);

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
      {aiStatus && !aiStatus.aiAvailable && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
          <p className="font-medium">⚠️ الذكاء الاصطناعي غير متاح</p>
          <p className="text-sm mt-1">{aiStatus.message}</p>
        </div>
      )}
      {aiStatus && aiStatus.aiAvailable && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-emerald-800 text-sm">
          ✓ {aiStatus.message}
        </div>
      )}
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
        <button
          type="button"
          onClick={() => setMode("manage")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === "manage" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          إدارة قاعدة البيانات
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

      {mode === "manage" && <ObdManage inputClass={inputClass} />}

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
          <div className="flex flex-wrap justify-between items-center gap-3 bg-emerald-50 rounded-lg px-4 py-3">
            <span className="font-medium text-gray-900">
              تم العثور على {analyzeResults.codesFound} كود — إجمالي التكلفة: {analyzeResults.totalCost} ج.م
            </span>
            {analyzeResults.vehicle && (analyzeResults.vehicle.brand || analyzeResults.vehicle.model || analyzeResults.vehicle.year) && (
              <span className="text-sm text-gray-600">
                {[analyzeResults.vehicle.brand, analyzeResults.vehicle.model, analyzeResults.vehicle.year].filter(Boolean).join(" · ")}
                {analyzeResults.vehicle.vin && ` · VIN: ${analyzeResults.vehicle.vin}`}
              </span>
            )}
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

function ObdManage({ inputClass }: { inputClass: string }) {
  const [brands, setBrands] = useState<{ id: string; name_ar: string; name_en: string | null }[]>([]);
  const [models, setModels] = useState<{ id: string; brand_id: string; name_ar: string; brand_name: string }[]>([]);
  const [newBrand, setNewBrand] = useState({ name_ar: "", name_en: "" });
  const [newModel, setNewModel] = useState({ brand_id: "", name_ar: "", name_en: "" });
  const [newCode, setNewCode] = useState({ code: "", description_ar: "", causes: "", solutions: "", symptoms: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/obd/brands")
      .then((r) => r.json())
      .then(setBrands)
      .catch(() => {});
  }, []);
  useEffect(() => {
    fetch("/api/admin/obd/models")
      .then((r) => r.json())
      .then(setModels)
      .catch(() => {});
  }, []);

  async function addBrand(e: React.FormEvent) {
    e.preventDefault();
    if (!newBrand.name_ar.trim()) return;
    setLoading(true);
    try {
      const r = await fetch("/api/admin/obd/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBrand),
      });
      const data = await r.json();
      if (r.ok) {
        setBrands((b) => [...b, { id: data.id, name_ar: data.name_ar, name_en: data.name_en }]);
        setNewBrand({ name_ar: "", name_en: "" });
      } else alert(data.error || "فشل");
    } catch {
      alert("حدث خطأ");
    } finally {
      setLoading(false);
    }
  }
  async function addModel(e: React.FormEvent) {
    e.preventDefault();
    if (!newModel.name_ar.trim() || !newModel.brand_id) return;
    setLoading(true);
    try {
      const r = await fetch("/api/admin/obd/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newModel),
      });
      const data = await r.json();
      if (r.ok) {
        const brand = brands.find((b) => b.id === newModel.brand_id);
        setModels((m) => [...m, { id: data.id, brand_id: newModel.brand_id, name_ar: data.name_ar, brand_name: brand?.name_ar || "" }]);
        setNewModel({ ...newModel, name_ar: "", name_en: "" });
      } else alert(data.error || "فشل");
    } catch {
      alert("حدث خطأ");
    } finally {
      setLoading(false);
    }
  }
  async function addCode(e: React.FormEvent) {
    e.preventDefault();
    if (!newCode.code.trim()) return;
    setLoading(true);
    try {
      const r = await fetch("/api/admin/obd/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCode),
      });
      const data = await r.json();
      if (r.ok) {
        setNewCode({ code: "", description_ar: "", causes: "", solutions: "", symptoms: "" });
        alert("تمت إضافة الكود");
      } else alert(data.error || "فشل");
    } catch {
      alert("حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4">ماركات المركبات</h3>
          <form onSubmit={addBrand} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newBrand.name_ar}
              onChange={(e) => setNewBrand((b) => ({ ...b, name_ar: e.target.value }))}
              placeholder="الاسم بالعربية"
              className={inputClass}
            />
            <input
              type="text"
              value={newBrand.name_en}
              onChange={(e) => setNewBrand((b) => ({ ...b, name_en: e.target.value }))}
              placeholder="الاسم بالإنجليزية"
              className={inputClass}
              dir="ltr"
            />
            <button type="submit" disabled={loading} className="px-4 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50">
              إضافة
            </button>
          </form>
          <ul className="text-sm text-gray-700 space-y-1">
            {brands.map((b) => (
              <li key={b.id}>{b.name_ar}</li>
            ))}
          </ul>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4">نماذج المركبات</h3>
          <form onSubmit={addModel} className="space-y-2 mb-4">
            <select
              value={newModel.brand_id}
              onChange={(e) => setNewModel((m) => ({ ...m, brand_id: e.target.value }))}
              className={inputClass}
            >
              <option value="">اختر الماركة</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name_ar}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="text"
                value={newModel.name_ar}
                onChange={(e) => setNewModel((m) => ({ ...m, name_ar: e.target.value }))}
                placeholder="النموذج بالعربية"
                className={inputClass}
              />
              <button type="submit" disabled={loading} className="px-4 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50">
                إضافة
              </button>
            </div>
          </form>
          <ul className="text-sm text-gray-700 space-y-1">
            {models.map((m) => (
              <li key={m.id}>{m.brand_name} — {m.name_ar}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-gray-900 mb-4">إضافة كود OBD يدوياً</h3>
        <form onSubmit={addCode} className="space-y-3">
          <input
            type="text"
            value={newCode.code}
            onChange={(e) => setNewCode((c) => ({ ...c, code: e.target.value.toUpperCase() }))}
            placeholder="الكود (مثال: P0100 أو 01314 أو B3902-00)"
            className={inputClass}
            dir="ltr"
          />
          <input
            type="text"
            value={newCode.description_ar}
            onChange={(e) => setNewCode((c) => ({ ...c, description_ar: e.target.value }))}
            placeholder="الوصف بالعربية"
            className={inputClass}
          />
          <input
            type="text"
            value={newCode.causes}
            onChange={(e) => setNewCode((c) => ({ ...c, causes: e.target.value }))}
            placeholder="الأسباب (افصل بـ |)"
            className={inputClass}
          />
          <input
            type="text"
            value={newCode.solutions}
            onChange={(e) => setNewCode((c) => ({ ...c, solutions: e.target.value }))}
            placeholder="الحلول (افصل بـ |)"
            className={inputClass}
          />
          <input
            type="text"
            value={newCode.symptoms}
            onChange={(e) => setNewCode((c) => ({ ...c, symptoms: e.target.value }))}
            placeholder="الأعراض (افصل بـ |)"
            className={inputClass}
          />
          <button type="submit" disabled={loading} className="px-6 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50">
            حفظ الكود
          </button>
        </form>
      </div>
    </div>
  );
}

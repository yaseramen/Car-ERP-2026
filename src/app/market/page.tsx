import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db/client";

export const metadata: Metadata = {
  title: "سوق EFCT | عروض موردين",
  description: "عرض إعلانات قطع غيار ومستلزمات ورشة — للتواصل المباشر مع المورّد. المنصة وسيط عرض فقط.",
};

async function fetchListings(category: "parts" | "workshop" | null) {
  try {
    let sql = `
      SELECT
        l.id,
        l.title_ar,
        l.description_ar,
        l.list_price,
        l.contact_phone,
        l.contact_whatsapp,
        l.image_url,
        l.category,
        l.ends_at,
        c.name as company_name
      FROM marketplace_listings l
      JOIN companies c ON c.id = l.company_id
      WHERE l.status = 'active'
        AND COALESCE(c.is_active, 1) = 1
        AND l.ends_at IS NOT NULL AND datetime(l.ends_at) > datetime('now')
        AND (
          (COALESCE(c.marketplace_enabled, 1) = 1 AND COALESCE(c.ads_globally_disabled, 0) = 0)
          OR l.wallet_tx_id IS NULL
        )
    `;
    const args: string[] = [];
    if (category) {
      sql += " AND l.category = ?";
      args.push(category);
    }
    sql += " ORDER BY l.ends_at DESC LIMIT 200";
    const res = await db.execute({ sql, args });
    return res.rows.map((r) => ({
      id: String(r.id),
      title_ar: String(r.title_ar ?? ""),
      description_ar: r.description_ar ? String(r.description_ar) : null,
      list_price: r.list_price != null ? Number(r.list_price) : null,
      contact_phone: String(r.contact_phone ?? ""),
      contact_whatsapp: r.contact_whatsapp ? String(r.contact_whatsapp) : null,
      image_url: r.image_url ? String(r.image_url) : null,
      category: String(r.category ?? ""),
      ends_at: String(r.ends_at ?? ""),
      company_name: String(r.company_name ?? ""),
    }));
  } catch {
    return [];
  }
}

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab === "workshop" ? "workshop" : "parts";
  const listings = await fetchListings(tab);

  return (
    <div
      className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100"
      dir="rtl"
    >
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-emerald-800 dark:text-emerald-400">سوق EFCT</h1>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed">
              عرض إعلانات فقط — البيع والشراء مباشرة مع المورّد. المنصة لا تتدخل في المعاملات.
            </p>
          </div>
          <Link
            href="/login"
            className="text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            دخول النظام
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-800">
          <Link
            href="/market?tab=parts"
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === "parts"
                ? "bg-white dark:bg-gray-900 border border-b-0 border-gray-200 dark:border-gray-700 text-emerald-800 dark:text-emerald-400"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/80"
            }`}
          >
            قطع غيار
          </Link>
          <Link
            href="/market?tab=workshop"
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === "workshop"
                ? "bg-white dark:bg-gray-900 border border-b-0 border-gray-200 dark:border-gray-700 text-emerald-800 dark:text-emerald-400"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/80"
            }`}
          >
            مستلزمات ومعدات ورشة
          </Link>
        </div>

        {listings.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400 py-16">
            لا توجد عروض نشطة في هذا القسم حالياً.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {listings.map((l) => (
              <li
                key={l.id}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col"
              >
                {l.image_url && (
                  <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-xs text-gray-600 dark:text-gray-400">{l.company_name}</p>
                  <h2 className="font-bold text-gray-900 dark:text-gray-100 mt-1">{l.title_ar}</h2>
                  {l.description_ar && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-3">
                      {l.description_ar}
                    </p>
                  )}
                  {l.list_price != null && (
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mt-2">
                      سعر إرشادي: {l.list_price.toFixed(2)} ج.م
                    </p>
                  )}
                  <div className="mt-auto pt-4 space-y-1 text-sm border-t border-gray-100 dark:border-gray-800">
                    <p>
                      <span className="text-gray-600 dark:text-gray-400">هاتف: </span>
                      <a
                        href={`tel:${l.contact_phone}`}
                        className="text-emerald-700 dark:text-emerald-400 font-medium dir-ltr inline-block"
                      >
                        {l.contact_phone}
                      </a>
                    </p>
                    {l.contact_whatsapp && (
                      <p>
                        <a
                          href={`https://wa.me/${l.contact_whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          واتساب
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

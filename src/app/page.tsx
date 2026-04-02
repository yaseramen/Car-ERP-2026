import type { Metadata } from "next";
import Link from "next/link";
import { HomeHeroBackground } from "@/components/marketing/home-hero-background";

export const metadata: Metadata = {
  title: "EFCT | إدارة مراكز الصيانة ومحلات قطع غيار السيارات",
  description:
    "برنامج متكامل لإدارة مراكز خدمة السيارات ومحلات بيع قطع الغيار. إدارة المخزون، الفواتير، الورشة، الكاشير، العملاء، الموردين، التقارير. أفضل برامج ادارة مراكز الصيانة في مصر.",
  keywords: [
    "برامج ادارة مراكز الصيانة",
    "برامج ادارة مراكز خدمة السيارات",
    "ادارة محلات قطع غيار السيارات",
    "برنامج ادارة قطع الغيار",
    "نظام إدارة ورش السيارات",
    "برنامج محاسبة لمراكز الصيانة",
    "إدارة مخزون قطع الغيار",
    "برنامج فواتير قطع غيار",
    "برنامج ورشة سيارات",
    "برنامج كاشير محلات قطع غيار",
    "برنامج إدارة العملاء والموردين",
    "برنامج تقارير مراكز الصيانة",
  ],
  openGraph: {
    title: "EFCT | إدارة مراكز الصيانة ومحلات قطع غيار السيارات",
    description:
      "برنامج متكامل لإدارة مراكز خدمة السيارات ومحلات بيع قطع الغيار. المخزون، الفواتير، الورشة، التقارير.",
    type: "website",
    locale: "ar_EG",
  },
  alternates: {
    canonical: "/",
  },
};

const FEATURES = [
  {
    title: "إدارة المخزون",
    desc: "تتبع أصناف قطع الغيار والعدد، تنبيهات نقص المخزون، حركة المخزون، تصنيفات وباركود.",
  },
  {
    title: "الورشة وأوامر الإصلاح",
    desc: "إدارة سيارات العملاء من الاستلام حتى التسليم، مراحل الفحص والصيانة، فحص قبل البيع/الشراء، ربط قطع الغيار والخدمات بالفواتير.",
  },
  {
    title: "الكاشير والفواتير",
    desc: "فواتير البيع والشراء والصيانة، طرق دفع متعددة، خصم وضريبة، إرجاع ومرتجعات، تصدير PDF وواتساب.",
  },
  {
    title: "العملاء والموردون",
    desc: "سجل العملاء مع سياراتهم وتاريخ الخدمات، إدارة الموردين وفواتير الشراء، تقارير المتابعة.",
  },
  {
    title: "التقارير والمالية",
    desc: "تقارير المبيعات والأرباح وحركة المخزون والورشة، خزائن منفصلة (مبيعات، ورشة، رئيسية)، تحويلات وتسويات.",
  },
  {
    title: "OBD وتشخيص الأعطال",
    desc: "بحث عن أكواد الأعطال وشرحها بالعربية، تحليل تقارير التشخيص، دعم قرارات الفنيين.",
  },
  {
    title: "سوق EFCT",
    desc: "صفحة عامة لعرض إعلانات المورّدين (قطع غيار ومستلزمات ورشة) مع أسعار تواصل وصور — المنصة وسيط عرض فقط، والبيع يتم مباشرة بين الطرفين.",
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "EFCT",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "برنامج متكامل لإدارة مراكز خدمة السيارات ومحلات بيع قطع الغيار. إدارة المخزون، الفواتير، الورشة، الكاشير، العملاء، الموردين، التقارير.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "EGP" },
};

/** حواف أفقية متجاوبة — md يبدأ من 768px (تابلت عمودي) */
const SECTION_X = "px-4 sm:px-6 md:px-10 lg:px-12";

export default function HomePage() {
  return (
    <div className="light-section min-h-screen bg-white text-gray-900 antialiased" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      {/* Hero — الصورة خلفية كاملة للقسم فقط (Next/Image)، لا تُحمَّل خارج الصفحة الرئيسية */}
      <section
        className={`marketing-hero relative isolate overflow-hidden min-h-[min(88vh,42rem)] sm:min-h-[min(90vh,46rem)] md:min-h-[min(85vh,44rem)] flex flex-col justify-center py-14 sm:py-20 md:py-20 lg:py-24 ${SECTION_X}`}
      >
        <HomeHeroBackground />
        <div className="relative z-10 max-w-3xl sm:max-w-4xl md:max-w-5xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-[2.75rem] lg:text-6xl font-extrabold text-emerald-950 mb-4 md:mb-5 tracking-tight text-pretty drop-shadow-sm">
            EFCT
          </h1>
          <p className="text-lg sm:text-xl md:text-[1.35rem] lg:text-2xl text-gray-900 mb-3 md:mb-4 font-medium leading-snug text-pretty drop-shadow-sm">
            منصة متكاملة لإدارة <strong className="font-bold">مراكز خدمة السيارات</strong> و{" "}
            <strong className="font-bold">محلات بيع قطع الغيار</strong>
          </p>
          <p className="text-base sm:text-base md:text-[1.05rem] lg:text-lg text-gray-800 mb-8 md:mb-10 max-w-2xl md:max-w-3xl mx-auto leading-relaxed text-pretty">
            أفضل <strong className="font-semibold text-gray-950">برامج ادارة مراكز الصيانة</strong> و{" "}
            <strong className="font-semibold text-gray-950">ادارة محلات قطع غيار السيارات</strong> — مخزون، فواتير، ورشة، كاشير، عملاء، موردين، تقارير
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-md sm:max-w-none mx-auto">
            <Link
              href="/login"
              className="inline-flex items-center justify-center min-h-[48px] px-8 py-3.5 md:py-4 text-base md:text-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium rounded-xl transition-colors shadow-lg shadow-emerald-900/20 touch-manipulation"
            >
              دخول للنظام
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center min-h-[48px] px-8 py-3.5 md:py-4 text-base md:text-lg border-2 border-emerald-700 text-emerald-800 bg-white/70 hover:bg-white active:bg-emerald-50/90 backdrop-blur-sm font-medium rounded-xl transition-colors touch-manipulation"
            >
              تسجيل شركة جديدة
            </Link>
            <Link
              href="/market"
              className="inline-flex items-center justify-center min-h-[48px] px-8 py-3.5 md:py-4 text-base md:text-lg border-2 border-sky-600 text-sky-900 bg-sky-50/90 hover:bg-sky-100 active:bg-sky-200/80 backdrop-blur-sm font-medium rounded-xl transition-colors touch-manipulation"
            >
              سوق EFCT — عروض المورّدين
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-700 max-w-xl mx-auto">
            <Link href="/market" className="text-sky-800 underline underline-offset-2 hover:text-sky-950 font-medium">
              تصفّح السوق العام
            </Link>
            {" "}بدون تسجيل: إعلانات قطع الغيار ومستلزمات الورشة، للتواصل المباشر مع المورّد.
          </p>
        </div>
      </section>

      {/* مقدمة */}
      <section className={`py-10 sm:py-12 md:py-14 bg-gray-50 ${SECTION_X}`}>
        <div className="max-w-3xl sm:max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-5 md:mb-6 text-center text-pretty">
            برنامج إدارة مراكز الصيانة ومحلات قطع الغيار
          </h2>
          <p className="text-gray-800 text-[15px] sm:text-base md:text-lg leading-relaxed mb-4 md:mb-5">
            <strong>EFCT</strong> هو نظام <strong>إدارة مراكز خدمة السيارات</strong> و{" "}
            <strong>محلات قطع الغيار</strong> مصمم خصيصاً لاحتياجات السوق المصري. يساعدك في إدارة المخزون،
            الفواتير، الورشة، العملاء، الموردين، والتقارير من مكان واحد.
          </p>
          <p className="text-gray-800 text-[15px] sm:text-base md:text-lg leading-relaxed">
            سواء كنت تدير <strong>مركز صيانة سيارات</strong> أو <strong>محل قطع غيار</strong> أو كليهما،
            يوفر البرنامج وحدات متكاملة تغطي كل جوانب العمل: من استلام السيارة وفحصها إلى إصدار الفاتورة
            وتتبع المدفوعات.
          </p>
        </div>
      </section>

      {/* المميزات */}
      <section className={`py-12 sm:py-16 md:py-20 ${SECTION_X}`}>
        <div className="max-w-5xl xl:max-w-6xl mx-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-8 md:mb-10 text-center text-pretty px-1">
            مميزات برنامج إدارة مراكز الصيانة وقطع الغيار
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-5 sm:p-6 md:p-7 shadow-sm border border-gray-100 hover:border-emerald-100 transition-colors"
              >
                <h3 className="font-bold text-gray-900 mb-2 md:mb-3 text-base sm:text-lg">{f.title}</h3>
                <p className="text-gray-700 text-sm sm:text-base leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* لمن هذا البرنامج */}
      <section className={`marketing-emerald-tint py-10 sm:py-12 md:py-14 bg-emerald-50/50 ${SECTION_X}`}>
        <div className="max-w-3xl sm:max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-5 md:mb-6 text-center text-pretty">
            لمن هذا البرنامج؟
          </h2>
          <ul className="space-y-3 md:space-y-4 text-gray-800 text-[15px] sm:text-base md:text-lg">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-1">✓</span>
              <span>
                <strong>مراكز صيانة السيارات</strong> — إدارة الورشة، أوامر الإصلاح، الفحص، قطع الغيار
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-1">✓</span>
              <span>
                <strong>محلات بيع قطع الغيار</strong> — إدارة المخزون، المبيعات، الكاشير، العملاء
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-1">✓</span>
              <span>
                <strong>مراكز متكاملة</strong> — ورشة + محل قطع غيار معاً
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* روابط إضافية */}
      <section className={`py-8 md:py-10 border-t border-gray-100 ${SECTION_X}`}>
        <div className="max-w-2xl mx-auto flex flex-wrap justify-center gap-5 sm:gap-6 md:gap-8 text-emerald-600 text-sm sm:text-base">
          <Link href="/market" className="hover:text-sky-800 font-medium text-sky-700">
            سوق EFCT (عروض المورّدين)
          </Link>
          <Link href="/how-it-works" className="hover:text-emerald-700 font-medium">
            كيف يعمل البرنامج
          </Link>
          <Link href="/faq" className="hover:text-emerald-700 font-medium">
            الأسئلة الشائعة
          </Link>
          <Link href="/terms" className="hover:text-emerald-700 font-medium">
            سياسة الاستخدام
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className={`py-12 sm:py-16 md:py-20 ${SECTION_X}`}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4 md:mb-5 text-pretty">
            ابدأ إدارة مركزك أو محلّك اليوم
          </h2>
          <p className="text-gray-800 text-[15px] sm:text-base md:text-lg mb-8 md:mb-10 leading-relaxed">
            سجّل شركتك مجاناً واستخدم برنامج <strong>إدارة مراكز الصيانة</strong> و{" "}
            <strong>محلات قطع الغيار</strong> بكل مميزاته.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors"
          >
            تسجيل شركة جديدة
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-8 md:py-10 border-t border-gray-200 text-center text-sm sm:text-base text-gray-600 ${SECTION_X}`}>
        <p className="mb-2">EFCT — إدارة مراكز الصيانة ومحلات قطع الغيار</p>
        <p>
          <Link href="/market" className="text-sky-700 hover:text-sky-900">
            سوق EFCT
          </Link>
          {" · "}
          <Link href="/how-it-works" className="text-emerald-600 hover:text-emerald-700">
            كيف يعمل
          </Link>
          {" · "}
          <Link href="/faq" className="text-emerald-600 hover:text-emerald-700">
            الأسئلة الشائعة
          </Link>
          {" · "}
          <Link href="/terms" className="text-emerald-600 hover:text-emerald-700">
            سياسة الاستخدام
          </Link>
        </p>
      </footer>
    </div>
  );
}

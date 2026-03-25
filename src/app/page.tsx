import type { Metadata } from "next";
import Link from "next/link";

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

export default function HomePage() {
  return (
    <div className="light-section min-h-screen bg-white" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      {/* Hero */}
      <section className="relative bg-gradient-to-b from-emerald-50 to-white py-16 sm:py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-emerald-900 mb-4 tracking-tight">
            EFCT
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            منصة متكاملة لإدارة <strong>مراكز خدمة السيارات</strong> و{" "}
            <strong>محلات بيع قطع الغيار</strong>
          </p>
          <p className="text-gray-500 mb-10 max-w-2xl mx-auto">
            أفضل <strong>برامج ادارة مراكز الصيانة</strong> و{" "}
            <strong>ادارة محلات قطع غيار السيارات</strong> — مخزون، فواتير، ورشة، كاشير، عملاء، موردين، تقارير
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-emerald-600/25"
            >
              دخول للنظام
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-medium rounded-xl transition-colors"
            >
              تسجيل شركة جديدة
            </Link>
          </div>
        </div>
      </section>

      {/* مقدمة */}
      <section className="py-12 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            برنامج إدارة مراكز الصيانة ومحلات قطع الغيار
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            <strong>EFCT</strong> هو نظام <strong>إدارة مراكز خدمة السيارات</strong> و{" "}
            <strong>محلات قطع الغيار</strong> مصمم خصيصاً لاحتياجات السوق المصري. يساعدك في إدارة المخزون،
            الفواتير، الورشة، العملاء، الموردين، والتقارير من مكان واحد.
          </p>
          <p className="text-gray-600 leading-relaxed">
            سواء كنت تدير <strong>مركز صيانة سيارات</strong> أو <strong>محل قطع غيار</strong> أو كليهما،
            يوفر البرنامج وحدات متكاملة تغطي كل جوانب العمل: من استلام السيارة وفحصها إلى إصدار الفاتورة
            وتتبع المدفوعات.
          </p>
        </div>
      </section>

      {/* المميزات */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">
            مميزات برنامج إدارة مراكز الصيانة وقطع الغيار
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-emerald-100 transition-colors"
              >
                <h3 className="font-bold text-gray-900 mb-3">{f.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* لمن هذا البرنامج */}
      <section className="py-12 px-6 bg-emerald-50/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            لمن هذا البرنامج؟
          </h2>
          <ul className="space-y-3 text-gray-700">
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
      <section className="py-8 px-6 border-t border-gray-100">
        <div className="max-w-2xl mx-auto flex flex-wrap justify-center gap-6 text-emerald-600">
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
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            ابدأ إدارة مركزك أو محلّك اليوم
          </h2>
          <p className="text-gray-600 mb-8">
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
      <footer className="py-8 px-6 border-t border-gray-200 text-center text-sm text-gray-500">
        <p className="mb-2">EFCT — إدارة مراكز الصيانة ومحلات قطع الغيار</p>
        <p>
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

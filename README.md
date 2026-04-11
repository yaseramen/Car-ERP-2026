# EFCT

منصة SaaS متكاملة لإدارة مراكز خدمة السيارات - مبنية بـ Next.js 15 و Turso و Tailwind CSS.

## البنية التقنية

- **Framework:** Next.js 15
- **Database:** Turso (LibSQL)
- **Styling:** Tailwind CSS
- **Language:** TypeScript

## هيكل المشروع

```
├── database/
│   ├── schema.sql          # مخطط قاعدة البيانات الشامل
│   └── SCHEMA_DIAGRAM.md   # توضيح العلاقات بين الجداول
├── scripts/
│   └── migrate.ts          # تشغيل migrations
├── src/
│   ├── app/
│   │   ├── (auth)/         # تسجيل الدخول
│   │   └── (dashboard)/    # لوحة التحكم
│   │       └── admin/      # لوحة التحكم (كل الأدوار تحت /admin)
│   ├── components/
│   ├── lib/
│   │   └── db/             # اتصال Turso
│   └── types/
└── .env                    # بيانات الاتصال (لا يُرفع)
```

## الإعداد

1. **نسخ ملف البيئة وتعبئته:**
   ```bash
   cp .env.example .env
   ```
   ثم عدّل `.env` بالقيم الفعلية. المتغيرات المطلوبة:

   | المتغير | مطلوب | الوصف |
   |---------|-------|-------|
   | `TURSO_DATABASE_URL` | ✅ | رابط قاعدة Turso (مثل `libsql://xxx.turso.io`) |
   | `TURSO_AUTH_TOKEN` | ✅ | رمز مصادقة Turso |
   | `AUTH_SECRET` أو `NEXTAUTH_SECRET` | ✅ | سري الجلسات (مثلاً: `openssl rand -base64 32`) |
   | `NEXTAUTH_URL` أو `NEXT_PUBLIC_APP_URL` | للإنتاج | رابط التطبيق (مثل `https://car.aiverce.com`) |
   | `NEXT_PUBLIC_SUPPORT_PHONE` | اختياري | يظهر في رسائل الخطأ وتسجيل الدخول (مثلاً `01001234567`) |
   | `NEXT_PUBLIC_SUPPORT_EMAIL` | اختياري | بريد الدعم في نفس الرسائل |

   **ملاحظة:** `npm run build` على Vercel **لا** يتصل بقاعدة البيانات. لكن **التشغيل** (تسجيل الدخول والـ API) يحتاج `TURSO_*` صحيحة في متغيرات البيئة.

   **للمالك بعد كل تحديث مهم من Git:** ادخل [Vercel → المشروع → Environment Variables](https://vercel.com/dashboard) وتأكد من المتغيرات، ثم من جهازك (مع `.env`) نفّذ `npm run db:migrate` إذا تغيّر مجلد `database/`.

2. **تشغيل Migrations:**
   ```bash
   npm run db:migrate
   ```
   **بعد كل تحديث للمخطط أو ملفات `database/migrations/`:** شغّل الأمر أعلاه **من جهازك** (مع `.env` يحتوي `TURSO_*` صحيحة) أو عبر واجهة Turso / CLI. الترحيل **ليس** جزءاً من `npm run build` حتى لا يفشل النشر عند انتهاء صلاحية الرمز أو خطأ 401.

3. **إضافة Super Admin (اختياري):**
   ```bash
   SEED_SUPER_ADMIN_PASSWORD=كلمة_المرور_المرغوبة npm run db:seed
   ```

4. **تشغيل التطبيق:**
   ```bash
   npm run dev
   ```

**بيانات Super Admin الافتراضية:** santws1@gmail.com / `Admin@123`  
لتغيير كلمة المرور: `SEED_SUPER_ADMIN_PASSWORD=الجديدة npm run db:seed`

**متغيرات Vercel المطلوبة:** `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET`, `NEXTAUTH_URL`  
*(بدون Turso في وقت التشغيل لن يعمل تسجيل الدخول والبيانات؛ البناء نفسه لا يعتمد عليها)*

**لنطاق مخصص (مثل car.aiverce.com):** أضف `NEXT_PUBLIC_APP_URL=https://car.aiverce.com` في Vercel → Settings → Environment Variables → Production. هذا يمنع إعادة التوجيه إلى vercel.app ويُبقي تسجيل الدخول على نطاقك.

**للتحقق من الإعداد:** افتح `/api/health` - إذا ظهر `auth: "missing_secret"` أضف AUTH_SECRET في Vercel → Settings → Environment Variables → Production

### قائمة تحقق سريعة للنشر (للمالك)

1. Turso: رابط القاعدة + Token صالحان في Vercel (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`).
2. `AUTH_SECRET` / `NEXTAUTH_SECRET` مضبوط.
3. `NEXTAUTH_URL` و`NEXT_PUBLIC_APP_URL` **يساويان** الرابط الذي يفتحه المستخدمون (نطاق واحد؛ لا خلط `vercel.app` مع النطاق المخصص).
4. بعد تحديث يغيّر قاعدة البيانات: `npm run db:migrate` من جهازك.
5. أسبوعياً: Turso → **Top Queries** للتأكد من استقرار القراءات بعد التحسينات.

### خطة تحسين تجربة المستخدم (مختصرة)

| المرحلة | ما تم / المطلوب |
|--------|------------------|
| **1 — جاهز في الكود** | رسالة دعم اختيارية (`NEXT_PUBLIC_SUPPORT_*`)، نسخ الرابط لفتح خارج فيسبوك/إنستغرام، رسالة أبسط لموظف عند تعطل قاعدة البيانات، تبطئة استطلاع الإشعارات قليلاً. |
| **2 — إعداد** | أضف في Vercel أرقام/بريد الدعم الفعلية لشركتك. |
| **3 — لاحقاً** | اختبارات تكامل (Playwright) لمسارات تسجيل الدخول والفاتورة؛ تحسينات واجهة حسب ملاحظات المستخدمين. |

## ملاحظات تقنية

- **Next.js 16 / middleware:** تظهر رسالة أن `middleware` أصبحت `proxy`. الحل المستقبلي: تشغيل `npx @next/codemod@canary middleware-to-proxy .` أو نقل منطق المصادقة إلى layout guards حسب توصيات Next.js 16.

## خارطة الطريق (ما بُني وما التالي)

راجع **`docs/PRODUCT_ROADMAP.md`** — ملخص تنفيذي لما تم منذ بداية المشروع وخطط التطوير المؤجلة (للمتابعة بين المحادثات).

## الميزات الرئيسية

- **مستخدمون وصلاحيات:** Super Admin، Tenant Owner، موظفون بصلاحيات دقيقة
- **مخازن متعددة:** رئيسي + عربات توزيع
- **فواتير:** بيع، شراء، صيانة مع طرق دفع متعددة
- **ورشة العمل:** استلام → فحص → صيانة → جاهزة → فاتورة
- **OBD:** تشخيص ذكي مع بحث محلي و AI
- **محفظة وخدمة رقمية:** خصم تلقائي من كل فاتورة
- **خزائن منفصلة:** صندوق البيع وصندوق الورشة

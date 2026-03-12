# الأمين لخدمات السيارات | Al-Ameen Car Services

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
│   │       ├── admin/      # Super Admin - شحن المحافظ
│   │       └── [tenant]/   # مسارات المركز
│   │           ├── warehouse/  # المخزن
│   │           ├── workshop/   # الورشة
│   │           ├── cashier/    # الكاشير
│   │           └── reports/    # التقارير
│   ├── components/
│   ├── lib/
│   │   └── db/             # اتصال Turso
│   └── types/
└── .env                    # بيانات الاتصال (لا يُرفع)
```

## الإعداد

1. **نسخ ملف البيئة:**
   ```bash
   cp .env.example .env
   ```

2. **تعبئة بيانات Turso في `.env`**

3. **تشغيل Migrations:**
   ```bash
   npm run db:migrate
   ```

4. **تشغيل التطبيق:**
   ```bash
   npm run dev
   ```

## الميزات الرئيسية

- **مستخدمون وصلاحيات:** Super Admin، Tenant Owner، موظفون بصلاحيات دقيقة
- **مخازن متعددة:** رئيسي + عربات توزيع
- **فواتير:** بيع، شراء، صيانة مع طرق دفع متعددة
- **ورشة العمل:** استلام → فحص → صيانة → جاهزة → فاتورة
- **OBD:** تشخيص ذكي مع بحث محلي و AI
- **محفظة وخدمة رقمية:** خصم تلقائي من كل فاتورة
- **خزائن منفصلة:** صندوق البيع وصندوق الورشة

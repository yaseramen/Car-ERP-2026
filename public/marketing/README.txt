صورة البانر الترويجية (نفس تصميم EFCT / AIVERCE الداكن):

1) صدّر الصورة كـ WebP (عرض حوالي 1600px لتبقى خفيفة).

2) ارفع الملف إلى GitHub بدون برنامج:
   - افتح المستودع على GitHub → مجلد public → marketing
   - Add file → Upload files
   - اسحب الملف وسمّه بالضبط: efct-promo-hero.webp
   - Commit إلى الفرع main

3) بعد النشر على Vercel ستظهر تلقائياً كخلفية ملء الشاشة للصفحة الرئيسية ولصفحات تسجيل الدخول والتسجيل.

بديل: ارفع الصورة إلى Vercel Blob وأضف في Environment:
NEXT_PUBLIC_MARKETING_HERO_URL=https://رابط-الصورة.webp

إذا لم يُرفع ملف بعد: يظهر SVG مدمج (hero-home.svg) حتى ترفع الصورة.

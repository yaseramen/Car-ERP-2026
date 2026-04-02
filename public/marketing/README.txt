خلفية الصفحة الرئيسية (/ ) وصفحة تسجيل الدخول (/login):

أ) الصورة الترويجية الداكنة (مثل لقطة EFCT/AIVERCE):
   - الأفضل: ارفعها كـ WebP مضغوط (عرض ~1600px) ثم إما:
     • ضع الملف: public/marketing/hero-main.webp
     • أو public/marketing/hero-main.jpg
   - أو في Vercel → Environment: NEXT_PUBLIC_MARKETING_HERO_URL=https://...رابط...webp

ب) بدون صورة: يُستخدم public/marketing/hero-home.svg (مدمج، خفيف).

ج) اسم قديم ما زال مدعوماً: hero-home.webp إن وُجد.

الترتيب: رابط البيئة → hero-main.webp → hero-main.jpg → hero-home.webp → hero-home.svg

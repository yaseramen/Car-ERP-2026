خلفية الصفحة الرئيسية (/) وصفحة تسجيل الدخول (/login):

• الافتراضي (مدمج في Git): public/marketing/hero-home.svg — خلفية داكنة بتصميم تقني (OBD/واجهة) خفيفة جداً.

• لاستبدالها بصورة فوتوغرافية حقيقية (اختياري):
  في Vercel → Environment Variables أضف:
  NEXT_PUBLIC_MARKETING_HERO_URL=https://رابط-صورتك.webp
  (مثلاً بعد رفع الملف من لوحة Vercel → Storage → Blob)

لا حاجة لرفع ملفات يدوياً إن رضيت بالخلفية المدمجة.

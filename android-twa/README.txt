TWA / Android (Bubblewrap) — دليل مختصر (AAB + APK من GitHub Actions)
====================================================================

أ) إنشاء مفتاح التوقيع (مرة واحدة — جهاز فيه Java / JDK)
   يجب أن يطابق twa-manifest.json: path = ./android.keystore و alias = android

   keytool -genkeypair -v -keystore android.keystore -alias android \
     -keyalg RSA -keysize 2048 -validity 10000

ب) أسرار GitHub (Repository → Settings → Secrets and variables → Actions)
   - KEYSTORE_BASE64  = محتوى الملف بعد التشفير base64 (سطر واحد بدون فواصل)
       Linux:  base64 -w0 android.keystore > keystore.b64
       macOS:  base64 -i android.keystore | tr -d '\n' > keystore.b64
       Windows (PowerShell): [Convert]::ToBase64String([IO.File]::ReadAllBytes("android.keystore")) | Out-File keystore.b64 -Encoding ascii
   - KEYSTORE_PASSWORD = كلمة مرور الـ keystore
   - KEY_PASSWORD      = كلمة مرور المفتاح (غالباً نفس KEYSTORE_PASSWORD)

ج) بناء الحزمة
   Actions → "Android TWA (Bubblewrap AAB)" → Run workflow
   (إن رأيت سابقاً: «licenses have not been accepted» أو build-tools 34/35 — تم معالجته في الـ workflow
    عبر قبول تراخيص Android SDK تلقائياً داخل Docker قبل Gradle.)
   - يُنزَّل من Artifacts:
     • app-release-bundle → ملف .aab (Google Play)
     • app-release-apk → app-release-signed.apk موقّع وجاهز للتثبيت على الهاتف
   لا تثبّت ملف app-release-unsigned.apk — النظام يرفضه؛ استخدم الملف الموقّع من الـ artifact فقط.
   - في سجل الـ job يظهر مربع "متغيرات Vercel": انسخ ANDROID_TWA_PACKAGE_NAME و ANDROID_TWA_SHA256_FINGERPRINTS.

د) وضع TWA احترافي (بدون شريط عنوان المتصفح)
   1) في Vercel → المشروع → Settings → Environment Variables (Production):
      ANDROID_TWA_PACKAGE_NAME        = نفس packageId في twa-manifest.json (مثلاً com.aiverce.carerp)
      ANDROID_TWA_SHA256_FINGERPRINTS = البصمة كما في سجل GitHub (صيغة AA:BB:... أو بدون نقطتين)
   2) Redeploy للموقع.
   3) تحقق: https://<host من twa-manifest>/.well-known/assetlinks.json
      يجب أن يعرض JSON فيه package_name و sha256_cert_fingerprints وليس [] فارغة.

هـ) Google Play
   ارفع الـ AAB نفسه الذي وقّعته بهذه الأسرار؛ البصمة أعلاه يجب أن تطابق شهادة التوقيع في Play.

packageId الافتراضي في المستودع: com.aiverce.carerp — غيّره من واجهة تشغيل الـ workflow إن لزم،
ومعه حدّث ANDROID_TWA_PACKAGE_NAME على Vercel لنفس القيمة.

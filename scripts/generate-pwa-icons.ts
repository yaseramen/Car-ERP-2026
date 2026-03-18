/**
 * تحويل icon.svg إلى أيقونات PNG مطلوبة لـ PWA (Windows/Android/iOS)
 * يعمل قبل البناء لضمان ظهور شعار التطبيق الصحيح عند التثبيت
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

async function main() {
  try {
    // استخدام sharp ديناميكياً لتجنب فشل البناء إذا لم يكن مثبتاً
    const sharp = await import("sharp");
    const publicDir = join(process.cwd(), "public");
    const svgPath = join(publicDir, "icon.svg");

    if (!existsSync(svgPath)) {
      console.warn("scripts/generate-pwa-icons: icon.svg غير موجود، تخطي التحويل");
      return;
    }

    const svgBuffer = readFileSync(svgPath);
    const sizes = [192, 512] as const;

    for (const size of sizes) {
      const pngBuffer = await sharp.default(svgBuffer)
        .resize(size, size)
        .png()
        .toBuffer();
      const outPath = join(publicDir, `icon-${size}.png`);
      writeFileSync(outPath, pngBuffer);
      console.log(`تم إنشاء ${outPath}`);
    }
  } catch (err) {
    console.warn("scripts/generate-pwa-icons: فشل التحويل (sharp قد لا يكون مثبتاً):", err);
  }
}

main();

/**
 * تحويل icon.svg إلى أيقونات PNG و favicon
 * يعمل قبل البناء لضمان ظهور شعار البرنامج في التبويب والتطبيق
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

async function main() {
  try {
    const sharp = await import("sharp");
    const publicDir = join(process.cwd(), "public");
    const appDir = join(process.cwd(), "src", "app");
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

    // نسخ icon-192 إلى app/icon.png لاستخدامه كـ favicon في التبويب
    const icon192 = join(publicDir, "icon-192.png");
    const appIcon = join(appDir, "icon.png");
    if (existsSync(icon192) && existsSync(appDir)) {
      writeFileSync(appIcon, readFileSync(icon192));
      console.log("تم تحديث app/icon.png (أيقونة التبويب)");
    }
  } catch (err) {
    console.warn("scripts/generate-pwa-icons: فشل التحويل:", err);
  }
}

main();

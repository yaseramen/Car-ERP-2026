/**
 * تحويل الشعار إلى أيقونات PNG و favicon
 * يدعم: public/icon.png (شعارك الأصلي) أو public/icon.svg
 * يعمل قبل البناء لضمان ظهور الشعار في التبويب والتطبيق
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

async function main() {
  try {
    const sharp = await import("sharp");
    const publicDir = join(process.cwd(), "public");
    const appDir = join(process.cwd(), "src", "app");

    // الأفضلية لـ icon.png (شعارك الأصلي) ثم icon.svg
    const pngSource = join(publicDir, "icon.png");
    const svgSource = join(publicDir, "icon.svg");
    const sourcePath = existsSync(pngSource) ? pngSource : existsSync(svgSource) ? svgSource : null;

    if (!sourcePath) {
      console.warn("scripts/generate-pwa-icons: لا يوجد icon.png ولا icon.svg في public/");
      return;
    }

    const inputBuffer = readFileSync(sourcePath);
    const sizes = [192, 512] as const;

    for (const size of sizes) {
      const pngBuffer = await sharp.default(inputBuffer)
        .resize(size, size)
        .png()
        .toBuffer();
      const outPath = join(publicDir, `icon-${size}.png`);
      writeFileSync(outPath, pngBuffer);
      console.log(`تم إنشاء ${outPath}`);
    }

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

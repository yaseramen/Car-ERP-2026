import { test, expect } from "@playwright/test";

const email = process.env.E2E_LOGIN_EMAIL?.trim();
const password = process.env.E2E_LOGIN_PASSWORD;
const tursoOk = Boolean(process.env.TURSO_DATABASE_URL?.trim() && process.env.TURSO_AUTH_TOKEN?.trim());
const fullE2e = Boolean(email && password && tursoOk);

/**
 * يعمل فقط إذا عرّفت في GitHub → Settings → Secrets and variables → Actions:
 *   TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
 *   E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD (مستخدم موجود في تلك القاعدة)
 * بدونها يُتخطّى الاختبار تلقائياً.
 */
test.describe("تسجيل دخول ناجح (أسرار GitHub — اختياري)", () => {
  test("بيانات صحيحة تفتح /admin", async ({ page }) => {
    test.skip(
      !fullE2e,
      "أضف أسرار المستودع: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD"
    );
    await page.goto("/login");
    await page.getByTestId("login-email").fill(email!);
    await page.getByTestId("login-password").fill(password!);
    await page.getByTestId("login-submit").click();
    await page.waitForURL(/\/admin/, { timeout: 45_000 });
    await expect(page).toHaveURL(/\/admin/);
  });
});

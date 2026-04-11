import { test, expect } from "@playwright/test";

test.describe("تسجيل الدخول", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("تعرض الصفحة العنوان والنموذج", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /EFCT/i })).toBeVisible();
    await expect(page.locator("p.text-gray-500").filter({ hasText: "تسجيل الدخول" })).toBeVisible();
    await expect(page.getByTestId("login-email")).toBeVisible();
    await expect(page.getByTestId("login-password")).toBeVisible();
    await expect(page.getByTestId("login-submit")).toBeVisible();
  });

  test("روابط التسجيل واستعادة كلمة المرور", async ({ page }) => {
    await expect(page.getByRole("link", { name: /تسجيل شركة جديدة/ })).toHaveAttribute("href", "/register");
    await expect(page.getByRole("link", { name: /استعادة عبر كود/ })).toHaveAttribute("href", "/reset-password");
  });

  test("إرسال بيانات خاطئة يظهر رداً من الخادم (بدون الاعتماد على نجاح الدخول)", async ({ page }) => {
    await page.getByTestId("login-email").fill("e2e-not-a-user@example.com");
    await page.getByTestId("login-password").fill("wrong-password-e2e");
    await page.getByTestId("login-submit").click();
    // إما رسالة خطأ في الصندوق الأحمر أو استمرار التحميل ثم خطأ — المهم ألا تبقى الصفحة كأن لم يحدث شيء
    await expect(page.getByTestId("login-submit")).not.toBeDisabled({ timeout: 30_000 });
    await expect(page.getByTestId("login-error")).toBeVisible({ timeout: 30_000 });
  });
});

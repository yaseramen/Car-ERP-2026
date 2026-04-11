import { defineConfig, devices } from "@playwright/test";

const authSecret = "e2e-test-auth-secret-min-32-characters!!";
const port = 3000;
const baseURL = `http://127.0.0.1:${port}`;
/** قيم وهمية — لا تُستخدم لاتصال حقيقي؛ تمنع رمي أثناء authorize إن وُجدت محاولة دخول */
const dummyTursoUrl = "libsql://e2e-placeholder.local";
const dummyTursoToken = "e2e-placeholder-token";

/**
 * تكامل E2E — صفحة تسجيل الدخول لا تحتاج Turso حتى الضغط على «دخول».
 * الخادم: next dev سريع؛ يتطلب AUTH_SECRET لجلسات NextAuth.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    locale: "ar-EG",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      AUTH_SECRET: authSecret,
      NEXTAUTH_SECRET: authSecret,
      NEXTAUTH_URL: baseURL,
      TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ?? dummyTursoUrl,
      TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ?? dummyTursoToken,
    },
  },
});

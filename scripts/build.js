/**
 * Vercel / production build: icons + next build only.
 * Database migrations are NOT run here — Turso 401 during build was breaking deploys.
 * After deploy, apply schema with valid credentials: npm run db:migrate
 * (from your machine, or Turso CLI / SQL console).
 */
const { spawnSync } = require("child_process");

console.warn(
  "[build] Skipping db:migrate (run `npm run db:migrate` separately with TURSO_* when you update schema)"
);

const icons = spawnSync("npm", ["run", "generate-icons"], { stdio: "inherit" });
if (icons.status !== 0) {
  console.warn("[build] generate-icons exited non-zero; continuing");
}

const next = spawnSync("npx", ["next", "build"], { stdio: "inherit" });
process.exit(next.status ?? 1);

/**
 * Vercel / CI build: migrations are opt-in on Vercel so a bad Turso token does not
 * block `next build`. Set RUN_DB_MIGRATE_ON_VERCEL=1 when build env has valid
 * TURSO_* vars. Else run `npm run db:migrate` locally or from CI with secrets.
 *
 * SKIP_DB_MIGRATE=1 always skips (e.g. local builds without DB).
 */
const { spawnSync } = require("child_process");

function runNpm(script) {
  const r = spawnSync("npm", ["run", script], { stdio: "inherit" });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

const skip =
  process.env.SKIP_DB_MIGRATE === "1" ||
  process.env.SKIP_DB_MIGRATE === "true";

const onVercel = Boolean(process.env.VERCEL);
const runMigrateOnVercel =
  process.env.RUN_DB_MIGRATE_ON_VERCEL === "1" ||
  process.env.RUN_DB_MIGRATE_ON_VERCEL === "true";

if (skip) {
  console.warn("[build] SKIP_DB_MIGRATE: skipping db:migrate");
} else if (onVercel && !runMigrateOnVercel) {
  console.warn(
    "[build] Vercel: skipping db:migrate (set RUN_DB_MIGRATE_ON_VERCEL=1 with valid TURSO_* to migrate at build time)"
  );
} else {
  runNpm("db:migrate");
}

const icons = spawnSync("npm", ["run", "generate-icons"], { stdio: "inherit" });
if (icons.status !== 0) {
  console.warn("[build] generate-icons exited non-zero; continuing");
}

const next = spawnSync("npx", ["next", "build"], { stdio: "inherit" });
process.exit(next.status ?? 1);

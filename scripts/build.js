/**
 * Vercel / CI build entry: runs migrations unless SKIP_DB_MIGRATE=1 (emergency only).
 * Turso 401 during migrate: fix TURSO_DATABASE_URL + TURSO_AUTH_TOKEN in project env,
 * or run `npm run db:migrate` locally / Turso shell with a valid token.
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

if (skip) {
  console.warn("[build] SKIP_DB_MIGRATE: skipping db:migrate");
} else {
  runNpm("db:migrate");
}

const icons = spawnSync("npm", ["run", "generate-icons"], { stdio: "inherit" });
if (icons.status !== 0) {
  console.warn("[build] generate-icons exited non-zero; continuing");
}

const next = spawnSync("npx", ["next", "build"], { stdio: "inherit" });
process.exit(next.status ?? 1);

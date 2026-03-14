import { db } from "./client";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

function stripComments(sql: string): string {
  return sql
    .split("\n")
    .map((line) => {
      const commentIdx = line.indexOf("--");
      return commentIdx >= 0 ? line.slice(0, commentIdx).trim() : line;
    })
    .join("\n");
}

function getStatements(sql: string): string[] {
  return stripComments(sql)
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => s + ";");
}

export async function runMigrations() {
  const schemaPath = join(process.cwd(), "database", "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  const statements = getStatements(schema);
  await db.batch(statements.map((stmt) => ({ sql: stmt })), "write");

  await db.execute({
    sql: "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, run_at TEXT DEFAULT (datetime('now')))",
  });

  const migrationsDir = join(process.cwd(), "database", "migrations");
  try {
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      const existing = await db.execute({
        sql: "SELECT 1 FROM _migrations WHERE name = ?",
        args: [file],
      });
      if (existing.rows.length > 0) {
        console.log(`⏭️  Skipped (already run): ${file}`);
        continue;
      }
      const content = readFileSync(join(migrationsDir, file), "utf-8");
      const stmts = getStatements(content);
      for (const stmt of stmts) {
        try {
          await db.execute({ sql: stmt });
        } catch (e: unknown) {
          const msg = String((e as Error)?.cause ?? e);
          if (msg.includes("duplicate column") || msg.includes("already exists")) {
            console.warn(`⚠️  Skipped (already applied): ${stmt.slice(0, 60)}...`);
          } else {
            throw e;
          }
        }
      }
      await db.execute({ sql: "INSERT OR IGNORE INTO _migrations (name) VALUES (?)", args: [file] });
      console.log(`✅ Ran migration: ${file}`);
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }

  console.log("✅ Database migrations completed successfully");
}

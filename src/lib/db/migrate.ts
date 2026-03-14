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

  const migrationsDir = join(process.cwd(), "database", "migrations");
  try {
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      const content = readFileSync(join(migrationsDir, file), "utf-8");
      const stmts = getStatements(content);
      if (stmts.length > 0) {
        await db.batch(stmts.map((stmt) => ({ sql: stmt })), "write");
        console.log(`✅ Ran migration: ${file}`);
      }
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }

  console.log("✅ Database migrations completed successfully");
}

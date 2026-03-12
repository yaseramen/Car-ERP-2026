import { db } from "./client";
import { readFileSync } from "fs";
import { join } from "path";

export async function runMigrations() {
  const schemaPath = join(process.cwd(), "database", "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");

  // Remove comments and split by statement-ending semicolons
  const lines = schema.split("\n");
  const withoutComments = lines
    .map((line) => {
      const commentIdx = line.indexOf("--");
      return commentIdx >= 0 ? line.slice(0, commentIdx).trim() : line;
    })
    .join("\n");

  const statements = withoutComments
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const batch = statements.map((stmt) => ({ sql: stmt + ";" }));
  await db.batch(batch, "write");

  console.log("✅ Database migrations completed successfully");
}

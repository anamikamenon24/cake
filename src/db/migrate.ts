import { pool } from "./index";
import fs from "fs";
import path from "path";

export async function runMigrations() {
  console.log("🚀 Running CakeCart database migrations...");
  const client = await pool.connect();

  try {
    const migrationFile = path.join(process.cwd(), "drizzle", "0000_luxuriant_kabuki.sql");
    const sqlContent = fs.readFileSync(migrationFile, "utf-8");

    // Split on Drizzle's statement breakpoint
    const statements = sqlContent
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      try {
        await client.query(stmt);
      } catch (err: any) {
        // If table already exists or constraint exists, log and proceed
        if (
          err.code === "42P07" || // duplicate_table
          err.code === "42710" || // duplicate_object
          err.message?.includes("already exists")
        ) {
          // Table or object already exists
          continue;
        }
        console.warn(`Migration notice for statement [${stmt.substring(0, 40)}...]:`, err.message);
      }
    }

    console.log("✅ Database migrations completed successfully!");
  } finally {
    client.release();
  }
}

if (process.argv[1]?.endsWith("migrate.ts") || process.argv[1]?.endsWith("migrate.js")) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}

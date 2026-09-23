import { pool } from "./index";
import { runMigrations } from "./migrate";
import { seedDatabase } from "./seed";

let isInitInProgress = false;
let isInitComplete = false;

export async function ensureDatabaseInitialized() {
  if (isInitComplete) return;
  if (isInitInProgress) return;

  isInitInProgress = true;
  try {
    console.log("🔍 Checking database tables existence...");
    const client = await pool.connect();
    let hasProducts = false;
    try {
      const checkRes = await client.query(
        `SELECT to_regclass('public.products') as exists`
      );
      hasProducts = Boolean(checkRes.rows[0]?.exists);
    } finally {
      client.release();
    }

    if (!hasProducts) {
      console.log("⚡ Database tables missing. Running automatic migrations and seeding...");
      await runMigrations();
      await seedDatabase();
      console.log("✅ Automatic database bootstrap complete!");
    } else {
      console.log("✅ Database tables already initialized.");
    }

    isInitComplete = true;
  } catch (error) {
    console.error("⚠️ Failed to auto-initialize database:", error);
  } finally {
    isInitInProgress = false;
  }
}

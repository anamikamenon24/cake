import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";
import path from "path";

const connectionString = process.env.DATABASE_URL;

export interface DbPoolLike {
  connect: () => Promise<DbClientLike>;
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, any>[] }>;
  end?: () => Promise<void>;
}

export interface DbClientLike {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, any>[] }>;
  release: () => void;
}

const globalForDb = globalThis as unknown as {
  conn: DbPoolLike | undefined;
  pgliteInstance: PGlite | undefined;
  isInitialized: boolean | undefined;
};

// Async mutex to simulate PostgreSQL row-level locking (SELECT ... FOR UPDATE) on single-instance embedded PGlite
class SimpleMutex {
  private queue: (() => void)[] = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const execute = () => {
        this.locked = true;
        resolve(() => {
          this.locked = false;
          const next = this.queue.shift();
          if (next) next();
        });
      };

      if (!this.locked) {
        execute();
      } else {
        this.queue.push(execute);
      }
    });
  }
}

const pgliteMutex = new SimpleMutex();

let activePool: DbPoolLike;

if (
  connectionString &&
  !connectionString.includes("user:password@ep-sample") &&
  !connectionString.includes("localhost:5432/cakecart")
) {
  // Use real PostgreSQL / Neon connection with connection pooler
  activePool =
    globalForDb.conn ??
    (new Pool({
      connectionString,
      ssl:
        process.env.NODE_ENV === "production" ||
        connectionString.includes("neon.tech") ||
        connectionString.includes("sslmode=require")
          ? { rejectUnauthorized: false }
          : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }) as unknown as DbPoolLike);
} else {
  // Use embedded PGlite with persistent data directory for self-contained testing & dev
  if (!globalForDb.pgliteInstance) {
    const dataDir = path.join(process.cwd(), ".pgdata");
    globalForDb.pgliteInstance = new PGlite(dataDir);
  }

  const pglite = globalForDb.pgliteInstance;

  async function ensureTables() {
    if (globalForDb.isInitialized) return;
    try {
      const check = await pglite.query(`SELECT to_regclass('public.products') as exists`);
      if (!check.rows[0]?.exists) {
        const { seedDatabase } = await import("./seed");
        await seedDatabase();
      }
      globalForDb.isInitialized = true;
    } catch {
      // If error occurs, continue
    }
  }

  activePool = {
    async connect(): Promise<DbClientLike> {
      const releaseMutex = await pgliteMutex.acquire();
      await ensureTables();
      return {
        async query(text: string, params?: unknown[]) {
          const res = await pglite.query(text, params as any[]);
          return { rows: res.rows as Record<string, any>[] };
        },
        release() {
          releaseMutex();
        },
      };
    },
    async query(text: string, params?: unknown[]) {
      const releaseMutex = await pgliteMutex.acquire();
      try {
        await ensureTables();
        const res = await pglite.query(text, params as any[]);
        return { rows: res.rows as Record<string, any>[] };
      } finally {
        releaseMutex();
      }
    },
  };
}

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = activePool;
}

export const pool = activePool;
export const db = drizzle(pool as any, { schema });
export type Database = typeof db;

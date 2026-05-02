import { Pool } from "pg";

const globalForPool = globalThis as unknown as { pool: Pool | undefined };

/**
 * Shared Postgres pool. Call only from server code (Route Handlers, Server Actions, server components that run queries).
 * Requires DATABASE_URL at runtime.
 */
export function getPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!globalForPool.pool) {
    globalForPool.pool = new Pool({ connectionString: url });
  }
  return globalForPool.pool;
}

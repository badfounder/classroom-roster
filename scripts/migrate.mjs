/**
 * Apply numbered SQL migrations from db/migrations in lexicographic order.
 * Usage: npm run db:migrate
 * Loads .env then .env.local from the project root if dotenv is available;
 * otherwise relies on env vars already being set (production containers).
 * DATABASE_URL required either way.
 */
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const migrationsDir = path.join(root, "db", "migrations");

// dotenv is a dev dependency. In production containers (Coolify, Docker)
// env vars come from the runtime, so a missing dotenv import is fine.
try {
  const { default: dotenv } = await import("dotenv");
  dotenv.config({ path: path.join(root, ".env") });
  dotenv.config({ path: path.join(root, ".env.local") });
} catch {
  // intentional fallthrough
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id serial PRIMARY KEY,
      filename text NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

async function appliedFilenames(client) {
  const { rows } = await client.query(
    "SELECT filename FROM schema_migrations ORDER BY filename"
  );
  return new Set(rows.map((r) => r.filename));
}

async function main() {
  const files = (await fs.readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No .sql files in db/migrations.");
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const done = await appliedFilenames(client);

    for (const file of files) {
      if (done.has(file)) {
        console.log(`Skip (already applied): ${file}`);
        continue;
      }
      const fullPath = path.join(migrationsDir, file);
      const sql = await fs.readFile(fullPath, "utf8");
      console.log(`Applying: ${file}`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    }
    console.log("Migrations finished.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

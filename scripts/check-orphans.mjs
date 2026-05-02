/**
 * Find files in the upload root that are not referenced by any DB row.
 *
 * Default: report only (manual filesystem audit — Flow 5 / backlog A6).
 * Pass --delete to remove orphans (nightly cleanup — backlog A5).
 *
 * Usage:
 *   node scripts/check-orphans.mjs           # audit, exit 0 if clean, 2 if orphans found
 *   node scripts/check-orphans.mjs --delete  # delete orphans (cron / post-class-delete)
 *
 * Loads .env then .env.local. Requires DATABASE_URL; honors UPLOAD_DIR (defaults to ./uploads).
 */
import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local") });

const shouldDelete = process.argv.includes("--delete");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const uploadRootRaw = process.env.UPLOAD_DIR ?? "./uploads";
const uploadRoot = path.isAbsolute(uploadRootRaw)
  ? uploadRootRaw
  : path.join(root, uploadRootRaw);

async function listFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    if (e.code === "ENOENT") return out;
    throw e;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listFiles(full)));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

async function pruneEmptyDirs(dir) {
  let removed = 0;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    if (e.code === "ENOENT") return 0;
    throw e;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      removed += await pruneEmptyDirs(path.join(dir, entry.name));
    }
  }
  const remaining = await fs.readdir(dir);
  if (remaining.length === 0 && dir !== uploadRoot) {
    await fs.rmdir(dir);
    removed += 1;
  }
  return removed;
}

async function main() {
  const pool = new pg.Pool({ connectionString });

  const known = new Set();
  try {
    const { rows: students } = await pool.query(
      `SELECT photo_path FROM students WHERE photo_path IS NOT NULL`
    );
    for (const r of students) known.add(r.photo_path);

    const { rows: classes } = await pool.query(
      `SELECT classroom_photo_path FROM classes WHERE classroom_photo_path IS NOT NULL`
    );
    for (const r of classes) known.add(r.classroom_photo_path);
  } finally {
    await pool.end();
  }

  const files = await listFiles(uploadRoot);
  const orphans = [];
  for (const absPath of files) {
    const rel = path.relative(uploadRoot, absPath).split(path.sep).join("/");
    if (!known.has(rel)) {
      orphans.push({ absPath, rel });
    }
  }

  if (orphans.length === 0) {
    console.log(`Clean: ${files.length} file(s) under ${uploadRoot}, no orphans.`);
    process.exit(0);
  }

  console.log(`Found ${orphans.length} orphan file(s) under ${uploadRoot}:`);
  for (const o of orphans) {
    console.log(`  ${o.rel}`);
  }

  if (!shouldDelete) {
    console.log(`\nRe-run with --delete to remove them.`);
    process.exit(2);
  }

  let deleted = 0;
  for (const o of orphans) {
    try {
      await fs.unlink(o.absPath);
      deleted += 1;
    } catch (e) {
      console.warn(`  failed to delete ${o.rel}: ${e.message}`);
    }
  }
  const prunedDirs = await pruneEmptyDirs(uploadRoot);
  console.log(`Deleted ${deleted} orphan file(s); pruned ${prunedDirs} empty dir(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

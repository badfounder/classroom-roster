import fs from "node:fs/promises";
import path from "node:path";
import { hashEditToken } from "@/lib/edit-token";
import { getPool } from "@/lib/db";
import { absoluteUploadPath, getUploadRoot } from "@/lib/uploads";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  if (!token) {
    return new Response("Not found", { status: 404 });
  }

  const tokenHash = hashEditToken(token);
  const pool = getPool();
  const { rows } = await pool.query<{ photo_path: string | null }>(
    `SELECT photo_path FROM students WHERE edit_token_hash = $1`,
    [tokenHash]
  );
  const row = rows[0];
  if (!row?.photo_path) {
    return new Response("Not found", { status: 404 });
  }

  if (row.photo_path.includes("..")) {
    return new Response("Bad request", { status: 400 });
  }

  const full = absoluteUploadPath(row.photo_path);
  const root = path.resolve(getUploadRoot());
  if (!path.resolve(full).startsWith(root + path.sep) && full !== root) {
    return new Response("Bad request", { status: 400 });
  }

  let buf: Buffer;
  try {
    buf = await fs.readFile(full);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const ext = path.extname(full).toLowerCase();
  const contentType = ext === ".png" ? "image/png" : "image/jpeg";

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, no-store",
    },
  });
}

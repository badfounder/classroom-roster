import fs from "node:fs/promises";
import path from "node:path";
import { hashEditToken } from "@/lib/edit-token";
import { getPool } from "@/lib/db";
import { absoluteUploadPath, getUploadRoot } from "@/lib/uploads";

const EXT_TO_TYPE: Record<string, string> = {
  ".webm": "audio/webm",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".mp4": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

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
  const { rows } = await pool.query<{ name_audio_path: string | null }>(
    `SELECT name_audio_path FROM students WHERE edit_token_hash = $1`,
    [tokenHash]
  );
  const row = rows[0];
  if (!row?.name_audio_path) {
    return new Response("Not found", { status: 404 });
  }

  if (row.name_audio_path.includes("..")) {
    return new Response("Bad request", { status: 400 });
  }

  const full = absoluteUploadPath(row.name_audio_path);
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
  const contentType = EXT_TO_TYPE[ext] ?? "application/octet-stream";

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, no-store",
    },
  });
}

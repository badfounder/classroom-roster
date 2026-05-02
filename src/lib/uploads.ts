import fs from "node:fs/promises";
import path from "node:path";

export function getUploadRoot(): string {
  const raw = process.env.UPLOAD_DIR ?? "./uploads";
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

/** Stored in DB relative to upload root, e.g. classes/{id}/classroom-xxx.jpg */
export function absoluteUploadPath(relativePath: string): string {
  return path.join(getUploadRoot(), relativePath);
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function unlinkQuiet(filePath: string): Promise<void> {
  await fs.unlink(filePath).catch(() => {});
}

export async function rmDirQuiet(dirPath: string): Promise<void> {
  await fs.rm(dirPath, { recursive: true, force: true }).catch(() => {});
}

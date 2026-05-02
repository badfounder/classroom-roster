import { createHash, randomBytes } from "node:crypto";

/** Opaque bearer token for student edit URLs (stored as SHA-256 hex). */
export function generateEditToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashEditToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

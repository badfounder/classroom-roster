/** Uppercase alphanumeric without 0/O, 1/I/L (visual ambiguity). */
const CLASS_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function randomClassCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CLASS_CODE_ALPHABET[bytes[i]! % CLASS_CODE_ALPHABET.length];
  }
  return out;
}

export function normalizeClassCode(raw: string): string {
  return raw.trim().toUpperCase();
}

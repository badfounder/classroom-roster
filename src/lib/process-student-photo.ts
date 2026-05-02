import sharp from "sharp";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_LONG_EDGE = 1024;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
]);

export function assertStudentProfilePhoto(file: File): void {
  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  const heicByName = name.endsWith(".heic") || name.endsWith(".heif");
  if (!ALLOWED_MIME.has(type) && !heicByName) {
    throw new Error("Photo must be JPEG, PNG, or HEIC.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Photo must be 5 MB or smaller.");
  }
}

export async function studentPhotoToJpegBuffer(file: File): Promise<Buffer> {
  assertStudentProfilePhoto(file);
  const input = Buffer.from(await file.arrayBuffer());
  return sharp(input)
    .rotate()
    .resize(MAX_LONG_EDGE, MAX_LONG_EDGE, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}

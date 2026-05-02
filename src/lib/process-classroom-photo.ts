import sharp from "sharp";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_LONG_EDGE = 2048;

const ALLOWED = new Set(["image/jpeg", "image/png"]);

export function assertClassroomImage(file: File): void {
  if (!ALLOWED.has(file.type)) {
    throw new Error("Classroom photo must be JPEG or PNG.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Classroom photo must be 10 MB or smaller.");
  }
}

export async function classroomPhotoToJpegBuffer(file: File): Promise<Buffer> {
  assertClassroomImage(file);
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

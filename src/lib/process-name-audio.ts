/**
 * Lightweight validation + filename routing for a student's recorded
 * name-pronunciation clip. We trust whatever container the browser produced
 * (webm/opus on Chrome/Firefox, m4a/aac on Safari) and serve it back via the
 * authenticated /api/uploads route. No transcoding — modern browsers can
 * decode each other's recordings.
 */

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB — plenty for a 10 s clip

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "audio/webm": "webm",
  "audio/webm;codecs=opus": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mp4;codecs=mp4a.40.2": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

export function assertNameAudio(file: File): void {
  if (file.size > MAX_BYTES) {
    throw new Error("Voice recording must be 2 MB or smaller.");
  }
  const type = (file.type || "").toLowerCase();
  if (!ALLOWED_MIME_TO_EXT[type] && !type.startsWith("audio/")) {
    throw new Error("Voice recording must be an audio file.");
  }
}

export function audioExtensionFor(file: File): string {
  const type = (file.type || "").toLowerCase();
  const exact = ALLOWED_MIME_TO_EXT[type];
  if (exact) return exact;
  // Generic audio/* fallback — pull from the file name if reasonable.
  const fromName = file.name.toLowerCase().match(/\.(webm|ogg|m4a|mp4|mp3|wav)$/);
  return fromName ? fromName[1] : "webm";
}

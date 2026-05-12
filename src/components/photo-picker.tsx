"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

/**
 * Photo input with three paths in priority order:
 *   1. Camera capture in-browser via getUserMedia (desktop + most laptops)
 *   2. Native camera capture on mobile via the `capture` attribute
 *   3. Plain file picker fallback
 *
 * Renders a preview thumbnail once a photo is chosen so students can confirm
 * before submitting. The selected photo is attached to a hidden file input
 * under the provided `name` so a normal form submission carries it.
 */
export function PhotoPicker({
  name = "photo",
  required = true,
  existingSrc = null,
}: {
  name?: string;
  required?: boolean;
  existingSrc?: string | null;
}) {
  const [mode, setMode] = useState<"pick" | "camera">("pick");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [hasFile, setHasFile] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);


  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (preview) URL.revokeObjectURL(preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showPreview(blob: Blob) {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(blob));
    setHasFile(true);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPreview(null);
      setHasFile(false);
      return;
    }
    setError(null);
    showPreview(file);
  }

  async function startCamera() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Your browser doesn't support in-browser camera capture.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setMode("camera");
      // Wait a tick so the <video> element is mounted, then attach the stream.
      window.requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch (e) {
      setError(
        e instanceof Error && e.name === "NotAllowedError"
          ? "Camera permission was blocked. Use the file picker instead."
          : "Couldn't start the camera. Use the file picker instead."
      );
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMode("pick");
  }

  function takeShot() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 720;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
        if (inputRef.current) {
          try {
            const dt = new DataTransfer();
            dt.items.add(file);
            inputRef.current.files = dt.files;
          } catch {
            // Fallback: skip — preview still shows, but the form won't carry
            // the file. User can switch to the file picker.
          }
        }
        showPreview(blob);
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  }

  function clearChoice() {
    if (inputRef.current) inputRef.current.value = "";
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setHasFile(false);
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Photo {required ? <span className="text-red-600">*</span> : null}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Use your camera or upload a recent picture (JPEG / PNG / HEIC, up to 5 MB).
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">{error}</p>
      ) : null}

      {mode === "camera" ? (
        <div className="mt-3 space-y-3">
          <div className="overflow-hidden rounded-xl border border-zinc-300 bg-black dark:border-zinc-700">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="aspect-video w-full bg-black object-cover"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={takeShot}>
              📸 Take photo
            </Button>
            <Button type="button" variant="secondary" onClick={stopCamera}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-start gap-3">
          {preview || existingSrc ? (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview ?? existingSrc ?? ""}
                alt="Selected"
                className="h-32 w-32 object-cover"
              />
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={hasFile ? "secondary" : "primary"}
              onClick={startCamera}
            >
              📷 Use camera
            </Button>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
              📁 Upload file
              <input
                ref={inputRef}
                name={name}
                type="file"
                accept="image/jpeg,image/png,image/heic,.heic"
                capture="user"
                required={required && !hasFile}
                onChange={onFileChange}
                className="sr-only"
              />
            </label>
            {hasFile ? (
              <Button type="button" variant="ghost" onClick={clearChoice}>
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" aria-hidden />
    </div>
  );
}

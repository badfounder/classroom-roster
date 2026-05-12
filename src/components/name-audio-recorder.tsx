"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

const MAX_SECONDS = 8;

type RecState = "idle" | "recording" | "recorded";

/**
 * Captures a short voice clip of the student saying their name. The recorded
 * blob is attached to a hidden file input under the provided `name` so a
 * normal form submission carries it server-side. Falls back gracefully when
 * the browser doesn't expose MediaRecorder — the file input remains in the
 * DOM (empty) and the field stays optional.
 */
export function NameAudioRecorder({
  name = "name_audio",
  existingSrc = null,
}: {
  name?: string;
  existingSrc?: string | null;
}) {
  const [state, setState] = useState<RecState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const tickRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      stopTicking();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopTicking() {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  function pickMimeType(): string | undefined {
    if (typeof MediaRecorder === "undefined") return undefined;
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4;codecs=mp4a.40.2",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c)) return c;
    }
    return undefined;
  }

  async function startRecording() {
    setError(null);
    if (
      typeof window.MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setError("Your browser doesn't support voice recording.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const finalType = mimeType ?? recorder.mimeType ?? "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalType });
        attachBlobToInput(blob, finalType);
        const url = URL.createObjectURL(blob);
        setBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setState("recorded");
        stopTicking();
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      recorder.start();
      setState("recording");
      setElapsed(0);
      startedAtRef.current = Date.now();
      tickRef.current = window.setInterval(() => {
        const seconds = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setElapsed(seconds);
        if (seconds >= MAX_SECONDS) {
          stopRecording();
        }
      }, 250);
    } catch (e) {
      setError(
        e instanceof Error && e.name === "NotAllowedError"
          ? "Microphone permission was blocked. You can skip this step."
          : "Couldn't start the microphone. You can skip this step."
      );
      setState("idle");
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  function reset() {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    chunksRef.current = [];
    if (inputRef.current) inputRef.current.value = "";
    setState("idle");
    setElapsed(0);
    setError(null);
  }

  function attachBlobToInput(blob: Blob, mimeType: string) {
    if (!inputRef.current) return;
    const ext = mimeType.includes("mp4")
      ? "m4a"
      : mimeType.includes("ogg")
      ? "ogg"
      : "webm";
    const file = new File([blob], `name-pronunciation.${ext}`, { type: mimeType });
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      inputRef.current.files = dt.files;
    } catch {
      // Older browser without DataTransfer; gracefully skip — the recording
      // simply won't post. The UI still plays back from blobUrl.
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Say your name (optional)
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            One quick clip so your professor can hear how you say it. Up to {MAX_SECONDS}{" "}
            seconds.
          </p>
        </div>
        {state === "recorded" ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
            Recorded
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">{error}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {state === "idle" ? (
          <Button type="button" variant="secondary" onClick={startRecording}>
            🎙️ Record
          </Button>
        ) : null}

        {state === "recording" ? (
          <>
            <Button type="button" variant="destructive" onClick={stopRecording}>
              ⏹ Stop
            </Button>
            <span className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
              Recording {elapsed}s / {MAX_SECONDS}s
            </span>
          </>
        ) : null}

        {state === "recorded" && blobUrl ? (
          <>
            <audio controls src={blobUrl} className="h-9" />
            <Button type="button" variant="ghost" onClick={reset}>
              Re-record
            </Button>
          </>
        ) : null}

        {state === "idle" && existingSrc ? (
          // Re-render the existing recording from the server (only shown in
          // edit views) so the student can replay what's on file.
          <audio controls src={existingSrc} className="h-9" />
        ) : null}
      </div>

      {/* Hidden file input that carries the recorded blob (or stays empty). */}
      <input ref={inputRef} type="file" name={name} accept="audio/*" className="hidden" />
    </div>
  );
}

"use client";

import { useState } from "react";

export function CopyLinks({
  joinUrl,
  surveyUrl,
  classCode,
}: {
  joinUrl: string;
  surveyUrl: string;
  classCode: string;
}) {
  const [status, setStatus] = useState<string | null>(null);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(`Copied ${label}`);
      window.setTimeout(() => setStatus(null), 2000);
    } catch {
      setStatus("Could not copy — select and copy manually.");
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Share with students
      </p>
      <dl className="mt-3 space-y-3 text-sm">
        <div>
          <dt className="text-zinc-600 dark:text-zinc-400">Join page (enter code)</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-2">
            <code className="break-all rounded bg-white px-2 py-1 text-xs dark:bg-zinc-950">{joinUrl}</code>
            <button
              type="button"
              onClick={() => copy(joinUrl, "URL")}
              className="shrink-0 rounded border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-white dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              Copy URL
            </button>
          </dd>
        </div>
        <div>
          <dt className="text-zinc-600 dark:text-zinc-400">Direct survey link</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-2">
            <code className="break-all rounded bg-white px-2 py-1 text-xs dark:bg-zinc-950">{surveyUrl}</code>
            <button
              type="button"
              onClick={() => copy(surveyUrl, "survey URL")}
              className="shrink-0 rounded border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-white dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              Copy URL
            </button>
          </dd>
        </div>
        <div>
          <dt className="text-zinc-600 dark:text-zinc-400">Class code</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-2">
            <code className="rounded bg-white px-2 py-1 font-mono text-base tracking-wider dark:bg-zinc-950">
              {classCode}
            </code>
            <button
              type="button"
              onClick={() => copy(classCode, "code")}
              className="shrink-0 rounded border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-white dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              Copy code
            </button>
          </dd>
        </div>
      </dl>
      {status ? (
        <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-400" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}

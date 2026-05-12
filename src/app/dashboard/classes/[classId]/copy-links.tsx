"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

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
    <div className="space-y-4">
      <CopyRow label="Direct survey link (recommended)" value={surveyUrl} onCopy={() => copy(surveyUrl, "survey URL")} />
      <CopyRow label="Join page (students enter the code)" value={joinUrl} onCopy={() => copy(joinUrl, "URL")} />
      <CopyRow label="Class code" value={classCode} mono onCopy={() => copy(classCode, "code")} />
      {status ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-400" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}

function CopyRow({
  label,
  value,
  mono,
  onCopy,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onCopy: () => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <div className="mt-1.5 flex flex-wrap items-stretch gap-2">
        <code
          className={`min-w-0 flex-1 break-all rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950 ${
            mono ? "font-mono text-base tabular tracking-wider" : "text-xs"
          }`}
        >
          {value}
        </code>
        <Button size="sm" variant="secondary" type="button" onClick={onCopy}>
          Copy
        </Button>
      </div>
    </div>
  );
}

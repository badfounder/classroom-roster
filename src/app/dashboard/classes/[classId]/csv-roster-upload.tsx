"use client";

import { useActionState } from "react";
import {
  uploadRosterCsv,
  type RosterFormState,
} from "./roster-actions";

export function CsvRosterUpload({ classId }: { classId: string }) {
  const bound = uploadRosterCsv.bind(null, classId);
  const [state, formAction, pending] = useActionState(
    bound,
    undefined as RosterFormState
  );

  return (
    <form action={formAction} encType="multipart/form-data" className="flex flex-col gap-3">
      {state && "error" in state ? (
        <p className="text-sm text-red-700 dark:text-red-300" role="alert">
          {state.error}
        </p>
      ) : null}
      {state && "info" in state ? (
        <p className="text-sm text-emerald-800 dark:text-emerald-200" role="status">
          {state.info}
        </p>
      ) : null}
      <div className="flex flex-wrap items-end gap-3">
        <input
          name="csv"
          type="file"
          accept=".csv,text/csv"
          required
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 dark:file:bg-zinc-700"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Uploading…" : "Upload CSV"}
        </button>
      </div>
    </form>
  );
}

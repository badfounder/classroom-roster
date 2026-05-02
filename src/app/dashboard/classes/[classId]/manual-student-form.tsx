"use client";

import { useActionState } from "react";
import {
  addManualStudent,
  type RosterFormState,
} from "./roster-actions";

export function ManualStudentForm({ classId }: { classId: string }) {
  const bound = addManualStudent.bind(null, classId);
  const [state, formAction, pending] = useActionState(
    bound,
    undefined as RosterFormState
  );

  return (
    <form action={formAction} encType="multipart/form-data" className="mt-4 grid gap-3 sm:grid-cols-2">
      {state && "error" in state ? (
        <p className="sm:col-span-2 text-sm text-red-700 dark:text-red-300" role="alert">
          {state.error}
        </p>
      ) : null}
      {state && "info" in state ? (
        <p className="sm:col-span-2 text-sm text-emerald-800 dark:text-emerald-200" role="status">
          {state.info}
        </p>
      ) : null}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Legal name</label>
        <input name="legal_name" required className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Preferred name</label>
        <input name="preferred_name" required className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Phonetic (optional)</label>
        <input name="phonetic_spelling" className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Pronouns (optional)</label>
        <input name="pronouns" className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900" />
      </div>
      <div className="sm:col-span-2 flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Fun fact</label>
        <textarea name="fun_fact" required rows={2} className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900" />
      </div>
      <div className="sm:col-span-2 flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Photo (optional)</label>
        <input
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/heic,.heic"
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 dark:file:bg-zinc-700"
        />
      </div>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          {pending ? "Adding…" : "Add student manually"}
        </button>
      </div>
    </form>
  );
}

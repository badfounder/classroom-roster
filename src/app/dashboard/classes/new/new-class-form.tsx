"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createClass, type ClassFormState } from "../actions";

export function NewClassForm() {
  const [state, formAction, pending] = useActionState(
    createClass,
    undefined as ClassFormState
  );

  return (
    <form action={formAction} encType="multipart/form-data" className="flex flex-col gap-4">
      {state?.error ? (
        <p
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Class name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          placeholder="e.g. Period 3 Biology"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="classroomPhoto"
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Classroom photo <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <input
          id="classroomPhoto"
          name="classroomPhoto"
          type="file"
          accept="image/jpeg,image/png"
          className="text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-sm file:font-medium dark:text-zinc-300 dark:file:bg-zinc-700"
        />
        <span className="text-xs text-zinc-500">JPEG or PNG, up to 10 MB.</span>
      </div>
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {pending ? "Creating…" : "Create class"}
        </button>
        <Link
          href="/dashboard"
          className="rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-50 dark:hover:bg-zinc-800"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

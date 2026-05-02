"use client";

import { useActionState } from "react";
import { replaceClassroomPhoto, type ClassFormState } from "../actions";

export function ReplacePhotoForm({ classId }: { classId: string }) {
  const bound = replaceClassroomPhoto.bind(null, classId);
  const [state, formAction, pending] = useActionState(
    bound,
    undefined as ClassFormState
  );

  return (
    <form action={formAction} encType="multipart/form-data" className="flex flex-col gap-2">
      {state?.error ? (
        <p className="text-sm text-red-700 dark:text-red-300" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-end gap-3">
        <input
          name="photo"
          type="file"
          accept="image/jpeg,image/png"
          required
          className="text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-sm dark:text-zinc-300 dark:file:bg-zinc-700"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {pending ? "Uploading…" : "Replace photo"}
        </button>
      </div>
    </form>
  );
}

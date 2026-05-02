"use client";

import { useActionState } from "react";
import { updateClassName, type ClassFormState } from "../actions";

export function RenameClassForm({
  classId,
  initialName,
}: {
  classId: string;
  initialName: string;
}) {
  const bound = updateClassName.bind(null, classId);
  const [state, formAction, pending] = useActionState(
    bound,
    undefined as ClassFormState
  );

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      {state?.error ? (
        <p className="w-full text-sm text-red-700 dark:text-red-300" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <label htmlFor="rename-name" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Class name
        </label>
        <input
          id="rename-name"
          name="name"
          type="text"
          required
          defaultValue={initialName}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

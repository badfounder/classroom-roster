"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitClassCode, type JoinFormState } from "./actions";

export function JoinForm() {
  const [state, formAction, pending] = useActionState(
    submitClassCode,
    undefined as JoinFormState
  );

  return (
    <form action={formAction} className="mx-auto flex max-w-md flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Student form
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Enter the class code your teacher gave you (6 characters).
      </p>
      {state?.error ? (
        <p
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="code" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Class code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={12}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-lg tracking-widest text-zinc-900 shadow-sm outline-none focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          placeholder="______"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {pending ? "Continuing…" : "Continue"}
      </button>
      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="font-medium text-zinc-900 underline dark:text-zinc-100">
          Home
        </Link>
      </p>
    </form>
  );
}

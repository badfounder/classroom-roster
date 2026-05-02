"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerTeacher } from "./actions";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(registerTeacher, undefined);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Create teacher account
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Email and password are stored on your server only.
      </p>
      <form action={formAction} className="mt-8 flex flex-col gap-4">
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
            Name <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <span className="text-xs text-zinc-500">At least 8 characters.</span>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-zinc-900 underline dark:text-zinc-100">
          Sign in
        </Link>
      </p>
    </div>
  );
}

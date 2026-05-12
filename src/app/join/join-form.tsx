"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitClassCode, type JoinFormState } from "./actions";
import { Alert, Button, Card } from "@/components/ui";

export function JoinForm() {
  const [state, formAction, pending] = useActionState(
    submitClassCode,
    undefined as JoinFormState
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <Card>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Join your class
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Enter the 6-character class code your teacher gave you.
        </p>

        <form action={formAction} className="mt-6 flex flex-col gap-4">
          {state?.error ? <Alert variant="error">{state.error}</Alert> : null}

          <div className="flex flex-col gap-2">
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
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-center font-mono text-2xl tabular tracking-[0.5em] text-zinc-900 shadow-sm placeholder:text-zinc-300 focus:border-zinc-500 focus:outline-none focus:ring-4 focus:ring-zinc-900/5 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-700"
              placeholder="ABCDEF"
              aria-describedby="code-help"
            />
            <p id="code-help" className="text-xs text-zinc-500 dark:text-zinc-400">
              Six letters and numbers, no spaces.
            </p>
          </div>

          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending ? "Continuing…" : "Continue"}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/" className="font-medium text-zinc-900 underline dark:text-zinc-100">
            Back to home
          </Link>
        </p>
      </Card>
    </div>
  );
}

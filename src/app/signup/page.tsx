"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerTeacher } from "./actions";
import { Alert, AuthShell, Button, Card, Field, Input } from "@/components/ui";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(registerTeacher, undefined);

  return (
    <AuthShell>
      <Card>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Create teacher account
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Email and password are stored on your server only.
        </p>

        <form action={formAction} className="mt-6 flex flex-col gap-4">
          {state?.error ? <Alert variant="error">{state.error}</Alert> : null}

          <Field
            label={
              <>
                Name <span className="font-normal text-zinc-500">(optional)</span>
              </>
            }
            htmlFor="name"
          >
            <Input id="name" name="name" type="text" autoComplete="name" />
          </Field>

          <Field label="Email" htmlFor="email" required>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@school.edu"
            />
          </Field>

          <Field
            label="Password"
            htmlFor="password"
            required
            hint="At least 8 characters."
          >
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
            />
          </Field>

          <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
            {pending ? "Creating…" : "Create account"}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline dark:text-zinc-100">
            Sign in
          </Link>
        </p>
      </Card>
    </AuthShell>
  );
}

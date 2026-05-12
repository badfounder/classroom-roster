"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitSurvey, type SurveyFormState } from "./actions";
import { Alert, Button, Card, Field, Input, Textarea } from "@/components/ui";

export function SurveyForm({ classCode }: { classCode: string }) {
  const bound = submitSurvey.bind(null, classCode);
  const [state, formAction, pending] = useActionState(
    bound,
    undefined as SurveyFormState
  );

  if (state && "success" in state && state.success) {
    const abs =
      typeof window !== "undefined"
        ? `${window.location.origin}${state.editPath}`
        : state.editPath;
    return (
      <div className="mx-auto w-full max-w-xl px-6 py-16">
        <Card>
          <p className="text-sm font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Submission received
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            You&rsquo;re all set
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            <strong>Bookmark this link</strong> — it&rsquo;s the only way to view or change your
            entry later. Your teacher cannot see it.
          </p>
          <p className="mt-4 break-all rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-sm dark:border-zinc-800 dark:bg-zinc-950">
            {abs}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={state.editPath}>
              <Button>Open my profile</Button>
            </Link>
            <Link href="/join">
              <Button variant="secondary">Join another class</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-16">
      <Card>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Your student profile
        </h1>
        <p className="mt-2 text-base text-zinc-600 dark:text-zinc-400">
          Your teacher uses this to learn names and faces. Photos stay on your school&rsquo;s
          server.
        </p>

        <form action={formAction} encType="multipart/form-data" className="mt-6 flex flex-col gap-5">
          {state && "error" in state ? <Alert variant="error">{state.error}</Alert> : null}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <input type="checkbox" name="consent" required className="mt-1 h-4 w-4" />
            <span className="text-sm text-zinc-800 dark:text-zinc-200">
              My parent or guardian has approved sharing this information with my teacher.
            </span>
          </label>

          <Field
            label="Photo"
            htmlFor="photo"
            required
            hint="JPEG, PNG, or HEIC — max 5 MB. EXIF metadata is stripped before storage."
          >
            <Input
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/heic,.heic"
              required
            />
          </Field>

          <Field label="Legal name" htmlFor="legal_name" required>
            <Input id="legal_name" name="legal_name" required autoComplete="name" />
          </Field>

          <Field
            label="Preferred name"
            htmlFor="preferred_name"
            required
            hint="What your teacher should call you in class."
          >
            <Input id="preferred_name" name="preferred_name" required />
          </Field>

          <Field
            label="Phonetic spelling"
            htmlFor="phonetic_spelling"
            hint="Optional — how to pronounce your name (e.g. KAY-tee for Katie)."
          >
            <Input id="phonetic_spelling" name="phonetic_spelling" placeholder="Optional" />
          </Field>

          <Field label="Pronouns" htmlFor="pronouns" required>
            <Input id="pronouns" name="pronouns" required />
          </Field>

          <Field
            label="Fun fact"
            htmlFor="fun_fact"
            required
            hint="One sentence — something that helps your teacher remember you."
          >
            <Textarea id="fun_fact" name="fun_fact" required rows={3} />
          </Field>

          <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
            {pending ? "Submitting…" : "Submit profile"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

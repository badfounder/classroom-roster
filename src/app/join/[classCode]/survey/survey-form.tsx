"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitSurvey, type SurveyFormState } from "./actions";
import { Alert, Button, Card, Field, Input, Textarea } from "@/components/ui";
import { NameAudioRecorder } from "@/components/name-audio-recorder";
import { PhotoPicker } from "@/components/photo-picker";

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
            You&rsquo;re in
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Thanks for submitting
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            <strong>Bookmark this private link</strong> — it&rsquo;s the only way to view or
            change your entry later. Your professor can&rsquo;t see it.
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
          A handful of quick questions so your professor can put a name and face together.
          Everything stays on the course server.
        </p>

        <form action={formAction} encType="multipart/form-data" className="mt-6 flex flex-col gap-6">
          {state && "error" in state ? <Alert variant="error">{state.error}</Alert> : null}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <input type="checkbox" name="consent" required className="mt-1 h-4 w-4" />
            <span className="text-sm text-zinc-800 dark:text-zinc-200">
              I&rsquo;m okay sharing the information below with my professor for this class.
            </span>
          </label>

          {/* The basics */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              The basics
            </h2>

            <Field label="Legal name" htmlFor="legal_name" required hint="As it appears in the class roster.">
              <Input id="legal_name" name="legal_name" required autoComplete="name" />
            </Field>

            <Field
              label="Preferred name"
              htmlFor="preferred_name"
              hint="Optional — what you actually want to be called. Leave blank to use your legal name."
            >
              <Input id="preferred_name" name="preferred_name" />
            </Field>

            <Field
              label="Phonetic spelling"
              htmlFor="phonetic_spelling"
              hint="Optional — e.g. KAY-tee for Katie. Or use the voice clip below."
            >
              <Input id="phonetic_spelling" name="phonetic_spelling" />
            </Field>

            <NameAudioRecorder />

            <Field
              label="Pronouns"
              htmlFor="pronouns"
              hint="Optional — leave blank if you'd rather not say."
            >
              <Input id="pronouns" name="pronouns" placeholder="she/her, he/him, they/them, …" />
            </Field>
          </section>

          {/* Photo */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              A photo
            </h2>
            <PhotoPicker />
          </section>

          {/* Quick questions */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              A few quick questions
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              All optional. Skip any that don&rsquo;t feel right.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Where are you from?" htmlFor="hometown">
                <Input id="hometown" name="hometown" placeholder="City, country, or just vibes" />
              </Field>
              <Field label="Major or program?" htmlFor="major">
                <Input id="major" name="major" placeholder="Undeclared is fine too" />
              </Field>
              <Field label="Favorite food?" htmlFor="favorite_food">
                <Input id="favorite_food" name="favorite_food" />
              </Field>
              <Field label="Weekend mode?" htmlFor="weekend_activity">
                <Input
                  id="weekend_activity"
                  name="weekend_activity"
                  placeholder="Hiking, gaming, sleeping…"
                />
              </Field>
              <Field
                label="If you could have one superpower?"
                htmlFor="superpower"
                className="sm:col-span-2"
              >
                <Input
                  id="superpower"
                  name="superpower"
                  placeholder="Teleportation? Eternal naps? Make your case."
                />
              </Field>
              <Field
                label="Anything else?"
                htmlFor="fun_fact"
                className="sm:col-span-2"
                hint="A line about yourself you think your professor would enjoy knowing."
              >
                <Textarea id="fun_fact" name="fun_fact" rows={3} />
              </Field>
            </div>
          </section>

          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending ? "Submitting…" : "Submit profile"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

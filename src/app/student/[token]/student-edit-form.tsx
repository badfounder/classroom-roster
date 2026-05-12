"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  deleteStudentSelf,
  updateStudentProfile,
  type StudentEditState,
} from "./actions";
import { Alert, Button, Card, Field, Input, Textarea } from "@/components/ui";
import { NameAudioRecorder } from "@/components/name-audio-recorder";
import { PhotoPicker } from "@/components/photo-picker";

type Props = {
  token: string;
  legalName: string;
  preferredName: string;
  phonetic: string | null;
  pronouns: string;
  funFact: string;
  hometown: string;
  major: string;
  favoriteFood: string;
  weekendActivity: string;
  superpower: string;
  photoSrc: string | null;
  audioSrc: string | null;
};

export function StudentEditForm({
  token,
  legalName,
  preferredName,
  phonetic,
  pronouns,
  funFact,
  hometown,
  major,
  favoriteFood,
  weekendActivity,
  superpower,
  photoSrc,
  audioSrc,
}: Props) {
  const updateBound = updateStudentProfile.bind(null, token);
  const [state, formAction, pending] = useActionState(
    updateBound,
    undefined as StudentEditState
  );

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-16">
      <Card>
        <p className="text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Your profile
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {preferredName || legalName}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Legal name on file:{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{legalName}</span>{" "}
          (contact your professor to change).
        </p>

        {state?.error ? (
          <div className="mt-6">
            <Alert variant="error">{state.error}</Alert>
          </div>
        ) : null}

        <form action={formAction} encType="multipart/form-data" className="mt-6 flex flex-col gap-6">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <input
              type="checkbox"
              name="consent"
              required
              defaultChecked
              className="mt-1 h-4 w-4"
            />
            <span className="text-sm text-zinc-800 dark:text-zinc-200">
              I&rsquo;m okay sharing this information with my professor for this class.
            </span>
          </label>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              The basics
            </h2>

            <Field
              label="Preferred name"
              htmlFor="preferred_name"
              hint="Leave blank to use your legal name."
            >
              <Input id="preferred_name" name="preferred_name" defaultValue={preferredName} />
            </Field>

            <Field label="Phonetic spelling" htmlFor="phonetic_spelling">
              <Input id="phonetic_spelling" name="phonetic_spelling" defaultValue={phonetic ?? ""} />
            </Field>

            <NameAudioRecorder existingSrc={audioSrc} />

            <Field label="Pronouns" htmlFor="pronouns">
              <Input id="pronouns" name="pronouns" defaultValue={pronouns} />
            </Field>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Photo
            </h2>
            <PhotoPicker required={false} existingSrc={photoSrc} />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              A few quick questions
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">All optional.</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Where are you from?" htmlFor="hometown">
                <Input id="hometown" name="hometown" defaultValue={hometown} />
              </Field>
              <Field label="Major or program?" htmlFor="major">
                <Input id="major" name="major" defaultValue={major} />
              </Field>
              <Field label="Favorite food?" htmlFor="favorite_food">
                <Input id="favorite_food" name="favorite_food" defaultValue={favoriteFood} />
              </Field>
              <Field label="Weekend mode?" htmlFor="weekend_activity">
                <Input
                  id="weekend_activity"
                  name="weekend_activity"
                  defaultValue={weekendActivity}
                />
              </Field>
              <Field label="One superpower?" htmlFor="superpower" className="sm:col-span-2">
                <Input id="superpower" name="superpower" defaultValue={superpower} />
              </Field>
              <Field label="Anything else?" htmlFor="fun_fact" className="sm:col-span-2">
                <Textarea id="fun_fact" name="fun_fact" rows={3} defaultValue={funFact} />
              </Field>
            </div>
          </section>

          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </form>

        <div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Delete my profile</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Removes your row, photo, and recording from this class. Cannot be undone.
          </p>
          <form
            action={deleteStudentSelf.bind(null, token)}
            onSubmit={(e) => {
              if (!window.confirm("Delete your profile from this class?")) {
                e.preventDefault();
              }
            }}
            className="mt-3"
          >
            <Button variant="destructive" type="submit">
              Delete my profile
            </Button>
          </form>
        </div>

        <p className="mt-8 text-center text-sm">
          <Link
            href="/join"
            className="font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Join another class
          </Link>
        </p>
      </Card>
    </div>
  );
}

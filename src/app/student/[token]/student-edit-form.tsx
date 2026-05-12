"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  deleteStudentSelf,
  updateStudentProfile,
  type StudentEditState,
} from "./actions";
import { Alert, Button, Card, Field, Input, Textarea } from "@/components/ui";

type Props = {
  token: string;
  legalName: string;
  preferredName: string;
  phonetic: string | null;
  pronouns: string;
  funFact: string;
  photoSrc: string | null;
};

export function StudentEditForm({
  token,
  legalName,
  preferredName,
  phonetic,
  pronouns,
  funFact,
  photoSrc,
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
          (contact your teacher to change).
        </p>

        {photoSrc ? (
          <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoSrc} alt="" className="max-h-72 w-full object-contain" />
          </div>
        ) : null}

        {state?.error ? (
          <div className="mt-6">
            <Alert variant="error">{state.error}</Alert>
          </div>
        ) : null}

        <form action={formAction} encType="multipart/form-data" className="mt-6 flex flex-col gap-5">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <input type="checkbox" name="consent" required defaultChecked className="mt-1 h-4 w-4" />
            <span className="text-sm text-zinc-800 dark:text-zinc-200">
              My parent or guardian has approved sharing this information with my teacher.
            </span>
          </label>

          <Field
            label="Replace photo"
            htmlFor="photo"
            hint="Leave empty to keep the current photo. Max 5 MB."
          >
            <Input
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/heic,.heic"
            />
          </Field>

          <Field label="Preferred name" htmlFor="preferred_name" required>
            <Input id="preferred_name" name="preferred_name" required defaultValue={preferredName} />
          </Field>

          <Field label="Phonetic spelling" htmlFor="phonetic_spelling">
            <Input id="phonetic_spelling" name="phonetic_spelling" defaultValue={phonetic ?? ""} />
          </Field>

          <Field label="Pronouns" htmlFor="pronouns" required>
            <Input id="pronouns" name="pronouns" required defaultValue={pronouns} />
          </Field>

          <Field label="Fun fact" htmlFor="fun_fact" required>
            <Textarea id="fun_fact" name="fun_fact" required rows={3} defaultValue={funFact} />
          </Field>

          <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </form>

        <div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Delete my profile</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Removes your row and photo from this class. Cannot be undone.
          </p>
          <form
            action={deleteStudentSelf.bind(null, token)}
            onSubmit={(e) => {
              if (!window.confirm("Delete your profile and photo from this class?")) {
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
          <Link href="/join" className="font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            Join another class
          </Link>
        </p>
      </Card>
    </div>
  );
}

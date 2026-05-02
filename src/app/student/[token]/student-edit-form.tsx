"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  deleteStudentSelf,
  updateStudentProfile,
  type StudentEditState,
} from "./actions";

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
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Your profile
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Legal name on file:{" "}
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{legalName}</span>{" "}
        (contact your teacher to change).
      </p>

      {photoSrc ? (
        <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoSrc} alt="" className="max-h-64 w-full object-contain" />
        </div>
      ) : null}

      {state?.error ? (
        <p
          className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <form action={formAction} encType="multipart/form-data" className="mt-8 flex flex-col gap-4">
        <label className="flex cursor-pointer gap-3 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
          <input type="checkbox" name="consent" required defaultChecked className="mt-1" />
          <span className="text-sm">
            My parent/guardian has approved sharing this information with my teacher.
          </span>
        </label>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Replace photo</label>
          <input
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/heic,.heic"
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 dark:file:bg-zinc-700"
          />
          <span className="text-xs text-zinc-500">Leave empty to keep the current photo.</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="preferred_name" className="text-sm font-medium">
            Preferred name
          </label>
          <input
            id="preferred_name"
            name="preferred_name"
            type="text"
            required
            defaultValue={preferredName}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="phonetic_spelling" className="text-sm font-medium">
            Phonetic spelling
          </label>
          <input
            id="phonetic_spelling"
            name="phonetic_spelling"
            type="text"
            defaultValue={phonetic ?? ""}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="pronouns" className="text-sm font-medium">
            Pronouns
          </label>
          <input
            id="pronouns"
            name="pronouns"
            type="text"
            required
            defaultValue={pronouns}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="fun_fact" className="text-sm font-medium">
            Fun fact
          </label>
          <textarea
            id="fun_fact"
            name="fun_fact"
            required
            rows={3}
            defaultValue={funFact}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>

      <div className="mt-12 border-t border-zinc-200 pt-8 dark:border-zinc-700">
        <form
          action={deleteStudentSelf.bind(null, token)}
          onSubmit={(e) => {
            if (!window.confirm("Delete your profile and photo from this class?")) {
              e.preventDefault();
            }
          }}
        >
          <button
            type="submit"
            className="text-sm font-medium text-red-700 underline dark:text-red-400"
          >
            Delete my profile for this class
          </button>
        </form>
      </div>

      <p className="mt-8 text-center text-sm">
        <Link href="/join" className="text-zinc-600 underline dark:text-zinc-400">
          Student join page
        </Link>
      </p>
    </div>
  );
}

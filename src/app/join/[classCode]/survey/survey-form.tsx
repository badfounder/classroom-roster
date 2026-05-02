"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitSurvey, type SurveyFormState } from "./actions";

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
      <div className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Submission received
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Bookmark your personal edit link — it is the only way to view or change your entry:
        </p>
        <p className="mt-4 break-all rounded-md bg-zinc-100 px-3 py-2 font-mono text-xs dark:bg-zinc-900">
          {abs}
        </p>
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href={state.editPath} className="font-medium text-zinc-900 underline dark:text-zinc-100">
            Open your profile
          </Link>{" "}
          ·{" "}
          <Link href="/join" className="font-medium text-zinc-900 underline dark:text-zinc-100">
            Join another class
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} encType="multipart/form-data" className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Student profile
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Your teacher uses this to learn names and faces. Photos stay on your school&apos;s server.
      </p>

      {state && "error" in state ? (
        <p
          className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-4">
        <label className="flex cursor-pointer gap-3 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
          <input type="checkbox" name="consent" required className="mt-1" />
          <span className="text-sm text-zinc-800 dark:text-zinc-200">
            My parent/guardian has approved sharing this information with my teacher.
          </span>
        </label>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="photo" className="text-sm font-medium">
            Photo <span className="text-red-600">*</span>
          </label>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/heic,.heic"
            required
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 dark:file:bg-zinc-700"
          />
          <span className="text-xs text-zinc-500">JPEG, PNG, or HEIC — max 5 MB before upload.</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="legal_name" className="text-sm font-medium">
            Legal name <span className="text-red-600">*</span>
          </label>
          <input
            id="legal_name"
            name="legal_name"
            type="text"
            required
            autoComplete="name"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="preferred_name" className="text-sm font-medium">
            Preferred name <span className="text-red-600">*</span>
          </label>
          <input
            id="preferred_name"
            name="preferred_name"
            type="text"
            required
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
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            placeholder="Optional"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="pronouns" className="text-sm font-medium">
            Pronouns <span className="text-red-600">*</span>
          </label>
          <input
            id="pronouns"
            name="pronouns"
            type="text"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="fun_fact" className="text-sm font-medium">
            Fun fact <span className="text-red-600">*</span>
          </label>
          <textarea
            id="fun_fact"
            name="fun_fact"
            required
            rows={3}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Submitting…" : "Submit"}
        </button>
      </div>
    </form>
  );
}

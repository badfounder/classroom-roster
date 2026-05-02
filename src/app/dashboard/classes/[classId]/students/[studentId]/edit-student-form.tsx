"use client";

import { useActionState } from "react";
import {
  updateStudentByTeacher,
  type RosterFormState,
} from "../../roster-actions";

type Props = {
  classId: string;
  studentId: string;
  legalName: string;
  preferredName: string;
  phonetic: string;
  pronouns: string;
  funFact: string;
  hasReviewFlag: boolean;
};

export function EditStudentForm({
  classId,
  studentId,
  legalName,
  preferredName,
  phonetic,
  pronouns,
  funFact,
  hasReviewFlag,
}: Props) {
  const bound = updateStudentByTeacher.bind(null, classId, studentId);
  const [state, formAction, pending] = useActionState(
    bound,
    undefined as RosterFormState
  );

  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      className="mt-6 grid gap-4 sm:grid-cols-2"
    >
      {state && "error" in state ? (
        <p
          className="sm:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state && "info" in state ? (
        <p
          className="sm:col-span-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
          role="status"
        >
          {state.info}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="legal_name" className="text-sm font-medium">Legal name</label>
        <input
          id="legal_name"
          name="legal_name"
          required
          defaultValue={legalName}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="preferred_name" className="text-sm font-medium">Preferred name</label>
        <input
          id="preferred_name"
          name="preferred_name"
          defaultValue={preferredName}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="phonetic_spelling" className="text-sm font-medium">Phonetic spelling</label>
        <input
          id="phonetic_spelling"
          name="phonetic_spelling"
          defaultValue={phonetic}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pronouns" className="text-sm font-medium">Pronouns</label>
        <input
          id="pronouns"
          name="pronouns"
          defaultValue={pronouns}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
      </div>

      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor="fun_fact" className="text-sm font-medium">Fun fact</label>
        <textarea
          id="fun_fact"
          name="fun_fact"
          rows={3}
          defaultValue={funFact}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
      </div>

      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor="photo" className="text-sm font-medium">Replace photo</label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/heic,.heic"
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 dark:file:bg-zinc-700"
        />
        <span className="text-xs text-zinc-500">Leave empty to keep the current photo. Max 5 MB.</span>
      </div>

      {hasReviewFlag ? (
        <label className="sm:col-span-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <input type="checkbox" name="clear_review" className="mt-0.5" />
          <span>
            Clear the review flag (mark this submission as resolved).
          </span>
        </label>
      ) : null}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import {
  updateStudentByTeacher,
  type RosterFormState,
} from "../../roster-actions";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";

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
    <form action={formAction} encType="multipart/form-data" className="grid gap-4 sm:grid-cols-2">
      {state && "error" in state ? (
        <div className="sm:col-span-2">
          <Alert variant="error">{state.error}</Alert>
        </div>
      ) : null}
      {state && "info" in state ? (
        <div className="sm:col-span-2">
          <Alert variant="success">{state.info}</Alert>
        </div>
      ) : null}

      <Field label="Legal name" htmlFor="legal_name" required>
        <Input id="legal_name" name="legal_name" required defaultValue={legalName} />
      </Field>
      <Field label="Preferred name" htmlFor="preferred_name">
        <Input id="preferred_name" name="preferred_name" defaultValue={preferredName} />
      </Field>
      <Field label="Phonetic spelling" htmlFor="phonetic_spelling">
        <Input id="phonetic_spelling" name="phonetic_spelling" defaultValue={phonetic} />
      </Field>
      <Field label="Pronouns" htmlFor="pronouns">
        <Input id="pronouns" name="pronouns" defaultValue={pronouns} />
      </Field>

      <Field label="Fun fact" htmlFor="fun_fact" className="sm:col-span-2">
        <Textarea id="fun_fact" name="fun_fact" rows={3} defaultValue={funFact} />
      </Field>

      <Field
        label="Replace photo"
        htmlFor="photo"
        hint="Leave empty to keep the current photo. Max 5 MB."
        className="sm:col-span-2"
      >
        <Input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/heic,.heic"
        />
      </Field>

      {hasReviewFlag ? (
        <label className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <input type="checkbox" name="clear_review" className="mt-1 h-4 w-4" />
          <span>Clear the review flag (mark this submission as resolved).</span>
        </label>
      ) : null}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

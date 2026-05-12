"use client";

import { useActionState } from "react";
import {
  addManualStudent,
  type RosterFormState,
} from "./roster-actions";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";

export function ManualStudentForm({ classId }: { classId: string }) {
  const bound = addManualStudent.bind(null, classId);
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

      <Field label="Legal name" required>
        <Input name="legal_name" required />
      </Field>
      <Field label="Preferred name" required>
        <Input name="preferred_name" required />
      </Field>
      <Field label="Phonetic spelling" hint="Optional — how to pronounce the name.">
        <Input name="phonetic_spelling" />
      </Field>
      <Field label="Pronouns" hint="Optional.">
        <Input name="pronouns" />
      </Field>
      <Field label="Fun fact" required className="sm:col-span-2">
        <Textarea name="fun_fact" required rows={2} />
      </Field>
      <Field
        label="Photo"
        hint="Optional — JPEG, PNG, or HEIC up to 5 MB."
        className="sm:col-span-2"
      >
        <Input name="photo" type="file" accept="image/jpeg,image/png,image/heic,.heic" />
      </Field>

      <div className="sm:col-span-2">
        <Button variant="secondary" type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add student manually"}
        </Button>
      </div>
    </form>
  );
}

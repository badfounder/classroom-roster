"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createClass, type ClassFormState } from "../actions";
import { Alert, Button, Field, Input } from "@/components/ui";

export function NewClassForm() {
  const [state, formAction, pending] = useActionState(
    createClass,
    undefined as ClassFormState
  );

  return (
    <form action={formAction} encType="multipart/form-data" className="flex flex-col gap-5">
      {state?.error ? <Alert variant="error">{state.error}</Alert> : null}

      <Field label="Class name" htmlFor="name" required>
        <Input id="name" name="name" required placeholder="e.g. Period 3 Biology" />
      </Field>

      <Field
        label={
          <>
            Classroom photo <span className="font-normal text-zinc-500">(optional)</span>
          </>
        }
        htmlFor="classroomPhoto"
        hint="JPEG or PNG, up to 10 MB. Used as the seating chart background."
      >
        <Input
          id="classroomPhoto"
          name="classroomPhoto"
          type="file"
          accept="image/jpeg,image/png"
        />
      </Field>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create class"}
        </Button>
        <Link href="/dashboard">
          <Button variant="secondary" type="button">Cancel</Button>
        </Link>
      </div>
    </form>
  );
}

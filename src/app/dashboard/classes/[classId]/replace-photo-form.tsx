"use client";

import { useActionState } from "react";
import { replaceClassroomPhoto, type ClassFormState } from "../actions";
import { Alert, Button, Input } from "@/components/ui";

export function ReplacePhotoForm({ classId }: { classId: string }) {
  const bound = replaceClassroomPhoto.bind(null, classId);
  const [state, formAction, pending] = useActionState(
    bound,
    undefined as ClassFormState
  );

  return (
    <form action={formAction} encType="multipart/form-data" className="flex flex-col gap-3">
      {state?.error ? <Alert variant="error">{state.error}</Alert> : null}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <Input name="photo" type="file" accept="image/jpeg,image/png" required />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Replace photo"}
        </Button>
      </div>
    </form>
  );
}

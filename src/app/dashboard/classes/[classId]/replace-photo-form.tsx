"use client";

import { useActionState, useRef } from "react";
import { replaceClassroomPhoto, type ClassFormState } from "../actions";
import { Alert, Button, Input } from "@/components/ui";

export function ReplacePhotoForm({ classId }: { classId: string }) {
  const bound = replaceClassroomPhoto.bind(null, classId);
  const [state, formAction, pending] = useActionState(
    bound,
    undefined as ClassFormState
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={formAction}
      encType="multipart/form-data"
      className="flex flex-col gap-3"
    >
      {state?.error ? <Alert variant="error">{state.error}</Alert> : null}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <Input
            name="photo"
            type="file"
            accept="image/jpeg,image/png"
            required
            disabled={pending}
            // Auto-submit the moment a file is picked so people don't have
            // to find and click a separate "Replace photo" button after
            // choosing a file — that pattern caused real "I uploaded a
            // photo and nothing happened" confusion.
            onChange={() => formRef.current?.requestSubmit()}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Replace photo"}
        </Button>
      </div>
      {pending ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Uploading and processing the image…
        </p>
      ) : null}
    </form>
  );
}

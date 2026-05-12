"use client";

import { useActionState } from "react";
import { updateClassName, type ClassFormState } from "../actions";
import { Alert, Button, Field, Input } from "@/components/ui";

export function RenameClassForm({
  classId,
  initialName,
}: {
  classId: string;
  initialName: string;
}) {
  const bound = updateClassName.bind(null, classId);
  const [state, formAction, pending] = useActionState(
    bound,
    undefined as ClassFormState
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state?.error ? <Alert variant="error">{state.error}</Alert> : null}
      <Field label="Class name" htmlFor="rename-name">
        <Input id="rename-name" name="name" required defaultValue={initialName} />
      </Field>
      <div>
        <Button variant="secondary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save name"}
        </Button>
      </div>
    </form>
  );
}

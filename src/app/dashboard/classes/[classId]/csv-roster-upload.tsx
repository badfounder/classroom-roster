"use client";

import { useActionState } from "react";
import {
  uploadRosterCsv,
  type RosterFormState,
} from "./roster-actions";
import { Alert, Button, Input } from "@/components/ui";

export function CsvRosterUpload({ classId }: { classId: string }) {
  const bound = uploadRosterCsv.bind(null, classId);
  const [state, formAction, pending] = useActionState(
    bound,
    undefined as RosterFormState
  );

  return (
    <form action={formAction} encType="multipart/form-data" className="flex flex-col gap-3">
      {state && "error" in state ? <Alert variant="error">{state.error}</Alert> : null}
      {state && "info" in state ? <Alert variant="success">{state.info}</Alert> : null}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <Input name="csv" type="file" accept=".csv,text/csv" required />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Upload CSV"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { deleteClass } from "../actions";
import { Button } from "@/components/ui";

export function DeleteClassForm({ classId, className }: { classId: string; className: string }) {
  return (
    <form
      action={deleteClass.bind(null, classId)}
      onSubmit={(e) => {
        const ok = window.confirm(
          `Delete “${className}” and all students, seating data, and photos? This cannot be undone.`
        );
        if (!ok) e.preventDefault();
      }}
      className="flex flex-col gap-2"
    >
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Delete this class</p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Removes the class, every student row, all seating positions, and the photo files on disk.
      </p>
      <div className="mt-2">
        <Button variant="destructive" type="submit">
          Delete class
        </Button>
      </div>
    </form>
  );
}

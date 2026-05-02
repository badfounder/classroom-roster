"use client";

import { deleteClass } from "../actions";

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
    >
      <button
        type="submit"
        className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-800 shadow-sm hover:bg-red-50 dark:border-red-800 dark:bg-zinc-900 dark:text-red-200 dark:hover:bg-red-950/40"
      >
        Delete class
      </button>
    </form>
  );
}

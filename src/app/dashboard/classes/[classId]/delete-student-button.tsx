"use client";

import { deleteStudentAction } from "./roster-actions";

export function DeleteStudentButton({
  classId,
  studentId,
  label,
}: {
  classId: string;
  studentId: string;
  label: string;
}) {
  return (
    <form
      action={deleteStudentAction.bind(null, classId, studentId)}
      className="inline"
      onSubmit={(e) => {
        if (!window.confirm(`Remove ${label} from this class? This also deletes their photo.`)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="text-sm font-medium text-red-700 hover:text-red-900 hover:underline dark:text-red-400 dark:hover:text-red-300"
      >
        Remove
      </button>
    </form>
  );
}

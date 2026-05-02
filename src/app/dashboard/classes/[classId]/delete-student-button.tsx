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
        if (!window.confirm(`Remove ${label} from this class?`)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="text-xs font-medium text-red-700 underline dark:text-red-400"
      >
        Remove
      </button>
    </form>
  );
}

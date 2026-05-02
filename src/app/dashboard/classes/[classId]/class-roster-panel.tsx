import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getPool } from "@/lib/db";
import { CsvRosterUpload } from "./csv-roster-upload";
import { DeleteStudentButton } from "./delete-student-button";
import { ManualStudentForm } from "./manual-student-form";

export async function ClassRosterPanel({ classId }: { classId: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }

  const pool = getPool();
  const { rows: students } = await pool.query<{
    id: string;
    legal_name: string;
    preferred_name: string | null;
    survey_submitted_at: Date | null;
    source: string;
    submission_review: string | null;
  }>(
    `SELECT id, legal_name, preferred_name, survey_submitted_at, source, submission_review
     FROM students
     WHERE class_id = $1
     ORDER BY legal_name ASC`,
    [classId]
  );

  const review = students.filter((s) => s.submission_review != null);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Roster (CSV)</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Required column <code className="text-xs">legal_name</code>; optional{" "}
          <code className="text-xs">preferred_name</code>,{" "}
          <code className="text-xs">pronouns</code>. Max 200 rows, 1 MB.{" "}
          <a
            href="/roster-template.csv"
            className="font-medium text-zinc-900 underline dark:text-zinc-100"
            download
          >
            Download template
          </a>
          .
        </p>
        <div className="mt-4">
          <CsvRosterUpload classId={classId} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Add student manually</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Bypass the survey when you already know the details. An edit link is shown after you save.
        </p>
        <ManualStudentForm classId={classId} />
      </section>

      {review.length > 0 ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <h2 className="text-sm font-medium text-amber-950 dark:text-amber-100">Review queue</h2>
          <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-200/90">
            These survey submissions did not match your roster cleanly. Resolve duplicates or remove
            incorrect rows below.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {review.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{s.legal_name}</span>
                  {s.preferred_name ? (
                    <span className="text-zinc-600 dark:text-zinc-400"> — {s.preferred_name}</span>
                  ) : null}
                  <span className="ml-2 rounded bg-amber-200/80 px-1.5 py-0.5 text-xs text-amber-950 dark:bg-amber-900 dark:text-amber-100">
                    {s.submission_review === "ambiguous_roster_match"
                      ? "Ambiguous roster match"
                      : "No roster match"}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <Link
                    href={`/dashboard/classes/${classId}/students/${s.id}`}
                    className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
                  >
                    Edit
                  </Link>
                  <DeleteStudentButton
                    classId={classId}
                    studentId={s.id}
                    label={s.legal_name}
                  />
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Students</h2>
          <Link
            href={`/api/classes/${classId}/export`}
            className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
          >
            Export JSON
          </Link>
        </div>
        {students.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            No students yet. Upload a CSV or add manually.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-700 dark:border-zinc-700">
            {students.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-sm"
              >
                <div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">{s.legal_name}</span>
                  {s.preferred_name ? (
                    <span className="text-zinc-600 dark:text-zinc-400"> — {s.preferred_name}</span>
                  ) : null}
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>Source: {s.source}</span>
                    {s.survey_submitted_at ? (
                      <span>Submitted</span>
                    ) : (
                      <span className="text-amber-800 dark:text-amber-200">Awaiting survey</span>
                    )}
                    {s.submission_review ? (
                      <span className="text-amber-800 dark:text-amber-200">Needs review</span>
                    ) : null}
                  </div>
                </div>
                <span className="flex items-center gap-3">
                  <Link
                    href={`/dashboard/classes/${classId}/students/${s.id}`}
                    className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
                  >
                    Edit
                  </Link>
                  <DeleteStudentButton classId={classId} studentId={s.id} label={s.legal_name} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

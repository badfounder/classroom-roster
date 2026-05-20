import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getPool } from "@/lib/db";
import { CsvRosterUpload } from "./csv-roster-upload";
import { DeleteStudentButton } from "./delete-student-button";
import { ManualStudentForm } from "./manual-student-form";
import { Badge, SectionHeader } from "@/components/ui";
import { EmptyRosterIllustration } from "@/components/illustrations";

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
  const submittedCount = students.filter((s) => s.survey_submitted_at != null).length;

  return (
    <div className="space-y-8">
      <section>
        <SectionHeader
          title="Roster upload (CSV)"
          description={
            <>
              Required column <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">legal_name</code>;
              optional <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">preferred_name</code>,{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">pronouns</code>. Max 200 rows, 1 MB.{" "}
              <a
                href="/roster-template.csv"
                className="font-medium text-zinc-900 underline dark:text-zinc-100"
                download
              >
                Download template
              </a>
              .
            </>
          }
        />
        <CsvRosterUpload classId={classId} />
      </section>

      <section className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <SectionHeader
          title="Add student manually"
          description="Bypass the survey when you already know the details. An edit link is shown after you save."
        />
        <ManualStudentForm classId={classId} />
      </section>

      {review.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-amber-950 dark:text-amber-100">
              Review queue ({review.length})
            </h2>
          </div>
          <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-200/90">
            These survey submissions did not match your roster cleanly. Resolve duplicates or remove
            incorrect rows.
          </p>
          <ul className="mt-4 space-y-2">
            {review.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200/60 bg-white/60 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/40"
              >
                <div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">{s.legal_name}</span>
                  {s.preferred_name ? (
                    <span className="text-zinc-600 dark:text-zinc-400"> — {s.preferred_name}</span>
                  ) : null}
                  <span className="ml-2">
                    <Badge variant="warning">
                      {s.submission_review === "ambiguous_roster_match"
                        ? "Ambiguous match"
                        : "No roster match"}
                    </Badge>
                  </span>
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
        </section>
      ) : null}

      <section className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <SectionHeader
          title={`Students (${students.length})`}
          description={
            students.length > 0
              ? `${submittedCount} of ${students.length} have submitted their profile.`
              : undefined
          }
          actions={
            students.length > 0 ? (
              <Link
                href={`/api/classes/${classId}/export`}
                className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
              >
                Export JSON
              </Link>
            ) : null
          }
        />

        {students.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-brand-200 bg-gradient-to-b from-brand-50/40 to-transparent px-5 py-8 text-center dark:border-brand-200/20 dark:from-brand-100/10">
            <EmptyRosterIllustration className="h-24 w-auto" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No students yet. Upload a CSV or add one manually above.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {students.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 dark:bg-zinc-900"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {s.legal_name}
                    {s.preferred_name ? (
                      <span className="font-normal text-zinc-500 dark:text-zinc-400"> &middot; {s.preferred_name}</span>
                    ) : null}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge variant="muted">Source: {s.source}</Badge>
                    {s.survey_submitted_at ? (
                      <Badge variant="success">Submitted</Badge>
                    ) : (
                      <Badge variant="warning">Awaiting survey</Badge>
                    )}
                    {s.submission_review ? <Badge variant="warning">Needs review</Badge> : null}
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

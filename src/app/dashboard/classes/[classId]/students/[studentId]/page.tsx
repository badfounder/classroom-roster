import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getPool } from "@/lib/db";
import { EditStudentForm } from "./edit-student-form";
import { Card, NavBack, PageHeader } from "@/components/ui";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ classId: string; studentId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { classId, studentId } = await params;
  const pool = getPool();

  const { rows } = await pool.query<{
    id: string;
    legal_name: string;
    preferred_name: string | null;
    phonetic_spelling: string | null;
    pronouns: string | null;
    fun_fact: string | null;
    photo_path: string | null;
    submission_review: string | null;
    class_name: string;
  }>(
    `SELECT s.id, s.legal_name, s.preferred_name, s.phonetic_spelling,
            s.pronouns, s.fun_fact, s.photo_path, s.submission_review,
            c.name AS class_name
     FROM students s
     JOIN classes c ON c.id = s.class_id
     WHERE s.id = $1 AND s.class_id = $2 AND c.teacher_id = $3`,
    [studentId, classId, session.user.id]
  );
  const student = rows[0];
  if (!student) {
    notFound();
  }

  const photoSrc = student.photo_path
    ? `/api/uploads/${encodeURI(student.photo_path)}`
    : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <NavBack href={`/dashboard/classes/${classId}`} label={student.class_name} />
      <div className="mt-6">
        <PageHeader
          eyebrow="Edit student"
          title={student.preferred_name ?? student.legal_name}
          description={`Legal name on file: ${student.legal_name}`}
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-start gap-6">
          {photoSrc ? (
            <div className="w-40 flex-shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950">
              {/* eslint-disable-next-line @next/next/no-img-element -- authenticated API route */}
              <img
                src={photoSrc}
                alt={`Photo of ${student.preferred_name ?? student.legal_name}`}
                className="aspect-square w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-40 w-40 flex-shrink-0 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40">
              No photo on file
            </div>
          )}
          <div className="min-w-0 flex-1">
            <EditStudentForm
              classId={classId}
              studentId={student.id}
              legalName={student.legal_name}
              preferredName={student.preferred_name ?? ""}
              phonetic={student.phonetic_spelling ?? ""}
              pronouns={student.pronouns ?? ""}
              funFact={student.fun_fact ?? ""}
              hasReviewFlag={student.submission_review != null}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getPool } from "@/lib/db";
import { EditStudentForm } from "./edit-student-form";

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
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        <Link
          href={`/dashboard/classes/${classId}`}
          className="font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          ← {student.class_name}
        </Link>
      </p>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Edit student
      </h1>

      {photoSrc ? (
        <div className="mt-6 max-w-xs overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900">
          {/* eslint-disable-next-line @next/next/no-img-element -- authenticated API route */}
          <img
            src={photoSrc}
            alt={`Photo of ${student.preferred_name ?? student.legal_name}`}
            className="max-h-64 w-full object-contain"
          />
        </div>
      ) : (
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">No photo on file.</p>
      )}

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
  );
}

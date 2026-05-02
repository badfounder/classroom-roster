import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getPool } from "@/lib/db";
import { SeatingChart } from "./seating-chart";

export default async function SeatingChartPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { classId } = await params;
  const pool = getPool();

  const { rows: classRows } = await pool.query<{
    id: string;
    name: string;
    classroom_photo_path: string | null;
  }>(
    `SELECT id, name, classroom_photo_path
     FROM classes WHERE id = $1 AND teacher_id = $2`,
    [classId, session.user.id]
  );
  const cls = classRows[0];
  if (!cls) {
    notFound();
  }

  const { rows: studentRows } = await pool.query<{
    id: string;
    legal_name: string;
    preferred_name: string | null;
    phonetic_spelling: string | null;
    pronouns: string | null;
    fun_fact: string | null;
    photo_path: string | null;
  }>(
    `SELECT id, legal_name, preferred_name, phonetic_spelling, pronouns, fun_fact, photo_path
     FROM students WHERE class_id = $1
     ORDER BY legal_name ASC`,
    [classId]
  );

  const { rows: positionRows } = await pool.query<{
    student_id: string;
    x: string;
    y: string;
  }>(
    `SELECT student_id, x::text, y::text
     FROM seating_positions WHERE class_id = $1`,
    [classId]
  );

  const initialPositions: Record<string, { x: number; y: number }> = {};
  for (const r of positionRows) {
    initialPositions[r.student_id] = { x: Number(r.x), y: Number(r.y) };
  }

  const students = studentRows.map((r) => ({
    id: r.id,
    legalName: r.legal_name,
    preferredName: r.preferred_name,
    phoneticSpelling: r.phonetic_spelling,
    pronouns: r.pronouns,
    funFact: r.fun_fact,
    photoSrc: r.photo_path ? `/api/uploads/${encodeURI(r.photo_path)}` : null,
  }));

  const classroomPhotoSrc = cls.classroom_photo_path
    ? `/api/uploads/${encodeURI(cls.classroom_photo_path)}`
    : null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        <Link
          href={`/dashboard/classes/${classId}`}
          className="font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          ← {cls.name}
        </Link>
      </p>

      <div className="mt-4 mb-8 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Seating chart
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Drag cards from the sidebar onto the canvas. Positions autosave on drop. Click a placed
          card for details.
        </p>
      </div>

      {students.length === 0 ? (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300">
          No students in this class yet. Add some via the roster panel before building a chart.
        </p>
      ) : (
        <SeatingChart
          classId={classId}
          classroomPhotoSrc={classroomPhotoSrc}
          students={students}
          initialPositions={initialPositions}
        />
      )}
    </div>
  );
}

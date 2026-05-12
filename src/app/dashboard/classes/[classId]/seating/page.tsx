import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getPool } from "@/lib/db";
import { SeatingChart } from "./seating-chart";
import { NavBack, PageHeader } from "@/components/ui";

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
    hometown: string | null;
    major: string | null;
    favorite_food: string | null;
    weekend_activity: string | null;
    superpower: string | null;
    photo_path: string | null;
    name_audio_path: string | null;
  }>(
    `SELECT id, legal_name, preferred_name, phonetic_spelling, pronouns, fun_fact,
            hometown, major, favorite_food, weekend_activity, superpower,
            photo_path, name_audio_path
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
    hometown: r.hometown,
    major: r.major,
    favoriteFood: r.favorite_food,
    weekendActivity: r.weekend_activity,
    superpower: r.superpower,
    photoSrc: r.photo_path ? `/api/uploads/${encodeURI(r.photo_path)}` : null,
    audioSrc: r.name_audio_path ? `/api/uploads/${encodeURI(r.name_audio_path)}` : null,
  }));

  const classroomPhotoSrc = cls.classroom_photo_path
    ? `/api/uploads/${encodeURI(cls.classroom_photo_path)}`
    : null;

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-12">
      <NavBack href={`/dashboard/classes/${classId}`} label={cls.name} />
      <div className="mt-6">
        <PageHeader
          eyebrow="Seating chart"
          title={cls.name}
          description="Drag cards from the sidebar onto the canvas. Positions autosave on drop. Click a placed card for details."
        />
      </div>

      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-8 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <p className="text-base font-medium text-zinc-900 dark:text-zinc-50">No students yet</p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Add students via the roster panel before building a chart.
          </p>
        </div>
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

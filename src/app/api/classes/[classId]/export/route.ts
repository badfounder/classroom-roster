import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getPool } from "@/lib/db";

export async function GET(
  _request: Request,
  context: { params: Promise<{ classId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { classId } = await context.params;
  const teacherId = session.user.id;
  const pool = getPool();

  const { rows: clsRows } = await pool.query<{
    id: string;
    name: string;
    class_code: string;
  }>(
    `SELECT id, name, class_code FROM classes WHERE id = $1 AND teacher_id = $2`,
    [classId, teacherId]
  );
  const cls = clsRows[0];
  if (!cls) {
    return new Response("Not found", { status: 404 });
  }

  const { rows: students } = await pool.query(
    `SELECT
       id,
       legal_name,
       preferred_name,
       phonetic_spelling,
       pronouns,
       fun_fact,
       photo_path,
       source,
       consent_confirmed_at,
       survey_submitted_at,
       submission_review,
       created_at,
       updated_at
     FROM students
     WHERE class_id = $1
     ORDER BY legal_name ASC`,
    [classId]
  );

  const body = JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      class: {
        id: cls.id,
        name: cls.name,
        class_code: cls.class_code,
      },
      students,
    },
    null,
    2
  );

  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="class-${cls.class_code}-roster.json"`,
    },
  });
}

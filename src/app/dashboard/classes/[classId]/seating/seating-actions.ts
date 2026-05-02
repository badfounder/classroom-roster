"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getPool } from "@/lib/db";

async function assertOwnsClassAndStudent(
  teacherId: string,
  classId: string,
  studentId: string
): Promise<boolean> {
  const pool = getPool();
  const { rowCount } = await pool.query(
    `SELECT 1
     FROM students s
     JOIN classes c ON c.id = s.class_id
     WHERE s.id = $1 AND s.class_id = $2 AND c.teacher_id = $3`,
    [studentId, classId, teacherId]
  );
  return (rowCount ?? 0) > 0;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

export async function placeStudent(
  classId: string,
  studentId: string,
  x: number,
  y: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;
  if (!teacherId) return { ok: false, error: "Not signed in." };
  if (!(await assertOwnsClassAndStudent(teacherId, classId, studentId))) {
    return { ok: false, error: "Class or student not found." };
  }

  const xClamped = clampPercent(x);
  const yClamped = clampPercent(y);

  const pool = getPool();
  await pool.query(
    `INSERT INTO seating_positions (class_id, student_id, x, y)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (class_id, student_id)
     DO UPDATE SET x = EXCLUDED.x, y = EXCLUDED.y, updated_at = now()`,
    [classId, studentId, xClamped, yClamped]
  );

  revalidatePath(`/dashboard/classes/${classId}/seating`);
  return { ok: true };
}

export async function removeFromChart(
  classId: string,
  studentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;
  if (!teacherId) return { ok: false, error: "Not signed in." };
  if (!(await assertOwnsClassAndStudent(teacherId, classId, studentId))) {
    return { ok: false, error: "Class or student not found." };
  }

  const pool = getPool();
  await pool.query(
    `DELETE FROM seating_positions WHERE class_id = $1 AND student_id = $2`,
    [classId, studentId]
  );

  revalidatePath(`/dashboard/classes/${classId}/seating`);
  return { ok: true };
}

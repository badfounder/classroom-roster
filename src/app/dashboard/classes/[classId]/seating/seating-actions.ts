"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getPool } from "@/lib/db";
import {
  computeGridPositions,
  computeRowColPositions,
  computeTablePositions,
} from "@/lib/seating-grid";
import { detectSeatsFromPhoto } from "@/lib/detect-seats";

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

/**
 * Lay any unplaced students out in an evenly-spaced grid. Skips students who
 * already have a seating position. Particularly useful when no classroom
 * photo is uploaded — the canvas would otherwise be empty until the teacher
 * dragged each card manually.
 *
 * Coordinates pad the edges (10%/15% gutters) so cards don't sit flush
 * against the canvas border, and center each card within its grid cell.
 */
export async function autoArrangeSeating(
  classId: string
): Promise<{ ok: true; placed: number } | { ok: false; error: string }> {
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;
  if (!teacherId) return { ok: false, error: "Not signed in." };

  const pool = getPool();
  const { rowCount: owned } = await pool.query(
    `SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2`,
    [classId, teacherId]
  );
  if (!owned) return { ok: false, error: "Class not found." };

  const { rows: unplaced } = await pool.query<{ id: string }>(
    `SELECT s.id
     FROM students s
     LEFT JOIN seating_positions p
       ON p.student_id = s.id AND p.class_id = s.class_id
     WHERE s.class_id = $1 AND p.id IS NULL
     ORDER BY lower(s.legal_name) ASC`,
    [classId]
  );

  if (unplaced.length === 0) {
    return { ok: true, placed: 0 };
  }

  const grid = computeGridPositions(unplaced.length);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < unplaced.length; i++) {
      await client.query(
        `INSERT INTO seating_positions (class_id, student_id, x, y)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (class_id, student_id) DO NOTHING`,
        [classId, unplaced[i]!.id, clampPercent(grid[i]!.x), clampPercent(grid[i]!.y)]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }

  revalidatePath(`/dashboard/classes/${classId}/seating`);
  return { ok: true, placed: unplaced.length };
}

export async function clearAllSeating(
  classId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;
  if (!teacherId) return { ok: false, error: "Not signed in." };

  const pool = getPool();
  const { rowCount: owned } = await pool.query(
    `SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2`,
    [classId, teacherId]
  );
  if (!owned) return { ok: false, error: "Class not found." };

  await pool.query(`DELETE FROM seating_positions WHERE class_id = $1`, [classId]);
  revalidatePath(`/dashboard/classes/${classId}/seating`);
  return { ok: true };
}

/* ----------------------- Seat slot CRUD ----------------------- */

async function assertOwnsClass(teacherId: string, classId: string): Promise<boolean> {
  const pool = getPool();
  const { rowCount } = await pool.query(
    `SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2`,
    [classId, teacherId]
  );
  return (rowCount ?? 0) > 0;
}

export async function addSeatSlot(
  classId: string,
  x: number,
  y: number,
  label?: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;
  if (!teacherId) return { ok: false, error: "Not signed in." };
  if (!(await assertOwnsClass(teacherId, classId))) {
    return { ok: false, error: "Class not found." };
  }

  const pool = getPool();
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO seat_slots (class_id, x, y, label)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [classId, clampPercent(x), clampPercent(y), label?.trim() || null]
  );

  revalidatePath(`/dashboard/classes/${classId}/seating`);
  return { ok: true, id: rows[0]!.id };
}

export async function deleteSeatSlot(
  classId: string,
  slotId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;
  if (!teacherId) return { ok: false, error: "Not signed in." };
  if (!(await assertOwnsClass(teacherId, classId))) {
    return { ok: false, error: "Class not found." };
  }

  const pool = getPool();
  await pool.query(`DELETE FROM seat_slots WHERE id = $1 AND class_id = $2`, [
    slotId,
    classId,
  ]);
  revalidatePath(`/dashboard/classes/${classId}/seating`);
  return { ok: true };
}

export async function clearSeatSlots(
  classId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;
  if (!teacherId) return { ok: false, error: "Not signed in." };
  if (!(await assertOwnsClass(teacherId, classId))) {
    return { ok: false, error: "Class not found." };
  }

  const pool = getPool();
  await pool.query(`DELETE FROM seat_slots WHERE class_id = $1`, [classId]);
  await pool.query(`DELETE FROM seat_groups WHERE class_id = $1`, [classId]);
  revalidatePath(`/dashboard/classes/${classId}/seating`);
  return { ok: true };
}

export async function updateSeatGroup(
  classId: string,
  groupId: string,
  name: string,
  description: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;
  if (!teacherId) return { ok: false, error: "Not signed in." };
  if (!(await assertOwnsClass(teacherId, classId))) {
    return { ok: false, error: "Class not found." };
  }
  const trimmedName = name.trim();
  const trimmedDesc = description.trim();

  const pool = getPool();
  await pool.query(
    `UPDATE seat_groups
       SET name = $1, description = $2
     WHERE id = $3 AND class_id = $4`,
    [
      trimmedName.length > 0 ? trimmedName : null,
      trimmedDesc.length > 0 ? trimmedDesc : null,
      groupId,
      classId,
    ]
  );
  revalidatePath(`/dashboard/classes/${classId}/seating`);
  revalidatePath(`/dashboard/classes/${classId}/print`);
  return { ok: true };
}

/**
 * Generate a rows × cols grid of seat slots across the canvas. Replaces any
 * existing slots. Returns the inserted rows so the client can update local
 * state without a reload.
 */
export async function generateSeatGrid(
  classId: string,
  rows: number,
  cols: number
): Promise<
  | {
      ok: true;
      slots: Array<{ id: string; x: number; y: number; label: string | null; groupId: string | null }>;
    }
  | { ok: false; error: string }
> {
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;
  if (!teacherId) return { ok: false, error: "Not signed in." };
  if (!(await assertOwnsClass(teacherId, classId))) {
    return { ok: false, error: "Class not found." };
  }
  const r = Math.max(1, Math.min(20, Math.floor(rows)));
  const c = Math.max(1, Math.min(20, Math.floor(cols)));
  if (r * c > 200) {
    return { ok: false, error: "That's more than 200 seats — pick smaller dimensions." };
  }

  const grid = computeRowColPositions(r, c);
  const pool = getPool();
  const client = await pool.connect();
  const inserted: Array<{
    id: string;
    x: number;
    y: number;
    label: string | null;
    groupId: string | null;
  }> = [];
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM seat_slots WHERE class_id = $1`, [classId]);
    await client.query(`DELETE FROM seat_groups WHERE class_id = $1`, [classId]);
    for (const seat of grid) {
      const { rows: ins } = await client.query<{ id: string }>(
        `INSERT INTO seat_slots (class_id, x, y, label)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [classId, clampPercent(seat.x), clampPercent(seat.y), seat.label]
      );
      inserted.push({
        id: ins[0]!.id,
        x: clampPercent(seat.x),
        y: clampPercent(seat.y),
        label: seat.label,
        groupId: null,
      });
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }

  revalidatePath(`/dashboard/classes/${classId}/seating`);
  return { ok: true, slots: inserted };
}

/**
 * Group-work layout: lay out `tables` clusters across the canvas, each with
 * `seatsPerTable` seats arranged around a rectangular table. Replaces
 * existing slots. Capped to keep the canvas readable.
 */
export async function generateSeatTables(
  classId: string,
  tables: number,
  seatsPerTable: number
): Promise<
  | {
      ok: true;
      slots: Array<{ id: string; x: number; y: number; label: string | null; groupId: string | null }>;
      groups: Array<{ id: string; index: number; name: string | null; description: string | null }>;
    }
  | { ok: false; error: string }
> {
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;
  if (!teacherId) return { ok: false, error: "Not signed in." };
  if (!(await assertOwnsClass(teacherId, classId))) {
    return { ok: false, error: "Class not found." };
  }
  const t = Math.max(1, Math.min(20, Math.floor(tables)));
  const s = Math.max(1, Math.min(12, Math.floor(seatsPerTable)));
  if (t * s > 200) {
    return { ok: false, error: "That's more than 200 seats — pick smaller numbers." };
  }

  const layout = computeTablePositions(t, s);
  const pool = getPool();
  const client = await pool.connect();
  const inserted: Array<{
    id: string;
    x: number;
    y: number;
    label: string | null;
    groupId: string | null;
  }> = [];
  const groups: Array<{
    id: string;
    index: number;
    name: string | null;
    description: string | null;
  }> = [];
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM seat_slots WHERE class_id = $1`, [classId]);
    await client.query(`DELETE FROM seat_groups WHERE class_id = $1`, [classId]);

    // Insert one seat_group per table so teachers can rename / annotate them
    // later. The group_index matches the T{n} label on the slots.
    const groupIds = new Map<number, string>();
    for (let i = 1; i <= t; i++) {
      const { rows: gIns } = await client.query<{ id: string }>(
        `INSERT INTO seat_groups (class_id, group_index)
         VALUES ($1, $2) RETURNING id`,
        [classId, i]
      );
      const id = gIns[0]!.id;
      groupIds.set(i, id);
      groups.push({ id, index: i, name: null, description: null });
    }

    for (const seat of layout) {
      const x = clampPercent(seat.x);
      const y = clampPercent(seat.y);
      const tableMatch = seat.label.match(/^T(\d+)·/);
      const groupId = tableMatch ? groupIds.get(Number(tableMatch[1])) ?? null : null;
      const { rows: ins } = await client.query<{ id: string }>(
        `INSERT INTO seat_slots (class_id, x, y, label, group_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [classId, x, y, seat.label, groupId]
      );
      inserted.push({ id: ins[0]!.id, x, y, label: seat.label, groupId });
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }

  revalidatePath(`/dashboard/classes/${classId}/seating`);
  return { ok: true, slots: inserted, groups };
}

/**
 * Ask Claude to detect seat positions in the classroom photo and persist
 * them. Replaces any existing slots so the user gets a clean detection.
 * Reports how many were created so the UI can confirm.
 */
export async function detectSeatsForClass(
  classId: string
): Promise<
  | {
      ok: true;
      slots: Array<{ id: string; x: number; y: number; label: string | null; groupId: string | null }>;
    }
  | { ok: false; error: string }
> {
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;
  if (!teacherId) return { ok: false, error: "Not signed in." };

  const pool = getPool();
  const { rows } = await pool.query<{ classroom_photo_path: string | null }>(
    `SELECT classroom_photo_path FROM classes
     WHERE id = $1 AND teacher_id = $2`,
    [classId, teacherId]
  );
  const cls = rows[0];
  if (!cls) return { ok: false, error: "Class not found." };
  if (!cls.classroom_photo_path) {
    return {
      ok: false,
      error: "Upload a classroom photo first, then try detection.",
    };
  }

  const detection = await detectSeatsFromPhoto(cls.classroom_photo_path);
  if (!detection.ok) return detection;
  if (detection.seats.length === 0) {
    return { ok: false, error: "Claude didn't find any seats in this image." };
  }

  const client = await pool.connect();
  const inserted: Array<{
    id: string;
    x: number;
    y: number;
    label: string | null;
    groupId: string | null;
  }> = [];
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM seat_slots WHERE class_id = $1`, [classId]);
    await client.query(`DELETE FROM seat_groups WHERE class_id = $1`, [classId]);
    for (const seat of detection.seats) {
      const x = clampPercent(seat.x);
      const y = clampPercent(seat.y);
      const { rows: ins } = await client.query<{ id: string }>(
        `INSERT INTO seat_slots (class_id, x, y, label)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [classId, x, y, seat.label ?? null]
      );
      inserted.push({ id: ins[0]!.id, x, y, label: seat.label ?? null, groupId: null });
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }

  revalidatePath(`/dashboard/classes/${classId}/seating`);
  return { ok: true, slots: inserted };
}

/* ------------------- Student placement ------------------- */

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

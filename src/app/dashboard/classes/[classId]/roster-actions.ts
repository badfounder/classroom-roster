"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { parseRosterCsv } from "@/lib/csv-roster";
import { generateEditToken, hashEditToken } from "@/lib/edit-token";
import { getPool } from "@/lib/db";
import { studentPhotoToJpegBuffer } from "@/lib/process-student-photo";
import { revalidatePath } from "next/cache";
import {
  absoluteUploadPath,
  ensureDir,
  getUploadRoot,
  rmDirQuiet,
  unlinkQuiet,
} from "@/lib/uploads";

export type RosterFormState =
  | { error: string }
  | { info: string }
  | undefined;

async function assertOwnsClass(
  teacherId: string,
  classId: string
): Promise<boolean> {
  const pool = getPool();
  const { rowCount } = await pool.query(
    `SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2`,
    [classId, teacherId]
  );
  return (rowCount ?? 0) > 0;
}

export async function uploadRosterCsv(
  classId: string,
  _prev: RosterFormState,
  formData: FormData
): Promise<RosterFormState> {
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;
  if (!teacherId) {
    return { error: "You must be signed in." };
  }
  if (!(await assertOwnsClass(teacherId, classId))) {
    return { error: "Class not found." };
  }

  const raw = formData.get("csv");
  if (!(raw instanceof File) || raw.size === 0) {
    return { error: "Choose a CSV file." };
  }

  const buffer = Buffer.from(await raw.arrayBuffer());
  const parsed = parseRosterCsv(buffer);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const pool = getPool();
  let inserted = 0;
  for (const row of parsed.rows) {
    const { rowCount } = await pool.query(
      `INSERT INTO students (class_id, legal_name, preferred_name, pronouns, source)
       SELECT $1, $2, $3, $4, 'csv'
       WHERE NOT EXISTS (
         SELECT 1 FROM students s
         WHERE s.class_id = $1
           AND lower(trim(s.legal_name)) = lower(trim($2::text))
       )`,
      [classId, row.legal_name, row.preferred_name, row.pronouns]
    );
    if ((rowCount ?? 0) > 0) inserted += 1;
  }

  revalidatePath(`/dashboard/classes/${classId}`);
  if (inserted === 0) {
    return {
      info: "No new rows added — every legal_name in this file already exists in this class.",
    };
  }
  return { info: `Added ${inserted} roster row(s).` };
}

export async function deleteStudentAction(classId: string, studentId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;
  if (!teacherId) return;

  const pool = getPool();
  const { rows } = await pool.query<{ photo_path: string | null }>(
    `SELECT s.photo_path
     FROM students s
     JOIN classes c ON c.id = s.class_id
     WHERE s.id = $1 AND s.class_id = $2 AND c.teacher_id = $3`,
    [studentId, classId, teacherId]
  );
  const row = rows[0];
  if (!row) return;

  await pool.query(`DELETE FROM students WHERE id = $1`, [studentId]);

  if (row.photo_path) {
    await unlinkQuiet(absoluteUploadPath(row.photo_path));
  }
  await rmDirQuiet(path.join(getUploadRoot(), "students", studentId));
  revalidatePath(`/dashboard/classes/${classId}`);
}

export async function addManualStudent(
  classId: string,
  _prev: RosterFormState,
  formData: FormData
): Promise<RosterFormState> {
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;
  if (!teacherId) {
    return { error: "You must be signed in." };
  }
  if (!(await assertOwnsClass(teacherId, classId))) {
    return { error: "Class not found." };
  }

  const legalName = String(formData.get("legal_name") ?? "").trim();
  const preferredName = String(formData.get("preferred_name") ?? "").trim();
  const phonetic = String(formData.get("phonetic_spelling") ?? "").trim();
  const pronouns = String(formData.get("pronouns") ?? "").trim();
  const funFact = String(formData.get("fun_fact") ?? "").trim();
  const rawPhoto = formData.get("photo");
  const photo =
    rawPhoto instanceof File && rawPhoto.size > 0 ? rawPhoto : null;

  if (!legalName || !preferredName || !funFact) {
    return {
      error: "Legal name, preferred name, and fun fact are required for a manual entry.",
    };
  }

  const token = generateEditToken();
  const tokenHash = hashEditToken(token);

  const pool = getPool();
  const client = await pool.connect();
  let studentId: string | null = null;

  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO students (
        class_id, legal_name, preferred_name, phonetic_spelling, pronouns, fun_fact,
        source, survey_submitted_at, edit_token_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, 'manual', now(), $7)
      RETURNING id`,
      [
        classId,
        legalName,
        preferredName,
        phonetic.length > 0 ? phonetic : null,
        pronouns.length > 0 ? pronouns : null,
        funFact,
        tokenHash,
      ]
    );
    studentId = rows[0]!.id;

    if (photo) {
      const buffer = await studentPhotoToJpegBuffer(photo);
      const fileName = `photo-${randomUUID()}.jpg`;
      const relative = `students/${studentId}/${fileName}`;
      const dir = absoluteUploadPath(`students/${studentId}`);
      await ensureDir(dir);
      await fs.writeFile(absoluteUploadPath(relative), buffer);
      await client.query(
        `UPDATE students SET photo_path = $1 WHERE id = $2`,
        [relative, studentId]
      );
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    if (e instanceof Error) {
      return { error: e.message };
    }
    throw e;
  } finally {
    client.release();
  }

  revalidatePath(`/dashboard/classes/${classId}`);
  return {
    info: `Student added. Share this private edit link with the student: /student/${token} (add your site’s domain in front).`,
  };
}

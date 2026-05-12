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

function takeString(formData: FormData, key: string): string | null {
  const raw = String(formData.get(key) ?? "").trim();
  return raw.length > 0 ? raw : null;
}

export async function updateStudentByTeacher(
  classId: string,
  studentId: string,
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

  const legalName = takeString(formData, "legal_name");
  const preferredName = takeString(formData, "preferred_name");
  const phonetic = takeString(formData, "phonetic_spelling");
  const pronouns = takeString(formData, "pronouns");
  const funFact = takeString(formData, "fun_fact");
  const hometown = takeString(formData, "hometown");
  const major = takeString(formData, "major");
  const favoriteFood = takeString(formData, "favorite_food");
  const weekendActivity = takeString(formData, "weekend_activity");
  const superpower = takeString(formData, "superpower");
  const clearReview = formData.get("clear_review") === "on";
  const rawPhoto = formData.get("photo");
  const photo =
    rawPhoto instanceof File && rawPhoto.size > 0 ? rawPhoto : null;

  if (!legalName) {
    return { error: "Legal name is required." };
  }

  const pool = getPool();
  const { rows: existing } = await pool.query<{ photo_path: string | null }>(
    `SELECT s.photo_path
     FROM students s
     JOIN classes c ON c.id = s.class_id
     WHERE s.id = $1 AND s.class_id = $2 AND c.teacher_id = $3`,
    [studentId, classId, teacherId]
  );
  if (!existing[0]) {
    return { error: "Student not found." };
  }
  const previousPhoto = existing[0].photo_path;

  const client = await pool.connect();
  let newPhotoPath: string | null = null;

  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE students
       SET legal_name = $1,
           preferred_name = $2,
           phonetic_spelling = $3,
           pronouns = $4,
           fun_fact = $5,
           hometown = $6,
           major = $7,
           favorite_food = $8,
           weekend_activity = $9,
           superpower = $10,
           submission_review = CASE WHEN $11::boolean THEN NULL ELSE submission_review END
       WHERE id = $12`,
      [
        legalName,
        preferredName,
        phonetic,
        pronouns,
        funFact,
        hometown,
        major,
        favoriteFood,
        weekendActivity,
        superpower,
        clearReview,
        studentId,
      ]
    );

    if (photo) {
      const buffer = await studentPhotoToJpegBuffer(photo);
      const fileName = `photo-${randomUUID()}.jpg`;
      const relative = `students/${studentId}/${fileName}`;
      await ensureDir(absoluteUploadPath(`students/${studentId}`));
      await fs.writeFile(absoluteUploadPath(relative), buffer);
      await client.query(
        `UPDATE students SET photo_path = $1 WHERE id = $2`,
        [relative, studentId]
      );
      newPhotoPath = relative;
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    if (newPhotoPath) {
      await unlinkQuiet(absoluteUploadPath(newPhotoPath));
    }
    if (e instanceof Error) {
      return { error: e.message };
    }
    throw e;
  } finally {
    client.release();
  }

  if (newPhotoPath && previousPhoto && previousPhoto !== newPhotoPath) {
    await unlinkQuiet(absoluteUploadPath(previousPhoto));
  }

  revalidatePath(`/dashboard/classes/${classId}`);
  revalidatePath(`/dashboard/classes/${classId}/students/${studentId}`);
  return { info: "Saved." };
}

export async function deleteStudentAction(classId: string, studentId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  const teacherId = session?.user?.id;
  if (!teacherId) return;

  const pool = getPool();
  const { rows } = await pool.query<{
    photo_path: string | null;
    name_audio_path: string | null;
  }>(
    `SELECT s.photo_path, s.name_audio_path
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
  if (row.name_audio_path) {
    await unlinkQuiet(absoluteUploadPath(row.name_audio_path));
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

  const legalName = takeString(formData, "legal_name");
  const preferredName = takeString(formData, "preferred_name");
  const phonetic = takeString(formData, "phonetic_spelling");
  const pronouns = takeString(formData, "pronouns");
  const funFact = takeString(formData, "fun_fact");
  const rawPhoto = formData.get("photo");
  const photo =
    rawPhoto instanceof File && rawPhoto.size > 0 ? rawPhoto : null;

  if (!legalName) {
    return { error: "Legal name is required." };
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
        phonetic,
        pronouns,
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

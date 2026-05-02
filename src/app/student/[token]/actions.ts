"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hashEditToken } from "@/lib/edit-token";
import { getPool } from "@/lib/db";
import { studentPhotoToJpegBuffer } from "@/lib/process-student-photo";
import {
  absoluteUploadPath,
  ensureDir,
  getUploadRoot,
  rmDirQuiet,
  unlinkQuiet,
} from "@/lib/uploads";

export type StudentEditState = { error: string } | undefined;

export async function updateStudentProfile(
  token: string,
  _prev: StudentEditState,
  formData: FormData
): Promise<StudentEditState> {
  const hash = hashEditToken(token);
  const consent = formData.get("consent");
  if (consent !== "on" && consent !== "true") {
    return {
      error: "Confirm that your parent/guardian approved sharing this information.",
    };
  }

  const preferredName = String(formData.get("preferred_name") ?? "").trim();
  const phonetic = String(formData.get("phonetic_spelling") ?? "").trim();
  const pronouns = String(formData.get("pronouns") ?? "").trim();
  const funFact = String(formData.get("fun_fact") ?? "").trim();
  const rawPhoto = formData.get("photo");

  if (!preferredName || !pronouns || !funFact) {
    return { error: "Preferred name, pronouns, and fun fact are required." };
  }

  const pool = getPool();
  const { rows } = await pool.query<{
    id: string;
    class_id: string;
    photo_path: string | null;
  }>(
    `SELECT id, class_id, photo_path FROM students WHERE edit_token_hash = $1`,
    [hash]
  );
  const row = rows[0];
  if (!row) {
    return { error: "This edit link is no longer valid." };
  }

  const studentId = row.id;
  const classId = row.class_id;
  const oldPhoto = row.photo_path;
  const replacePhoto =
    rawPhoto instanceof File && rawPhoto.size > 0 ? rawPhoto : null;

  let newRelative: string | null = null;
  if (replacePhoto) {
    try {
      const buffer = await studentPhotoToJpegBuffer(replacePhoto);
      const fileName = `photo-${randomUUID()}.jpg`;
      newRelative = `students/${studentId}/${fileName}`;
      await ensureDir(absoluteUploadPath(`students/${studentId}`));
      await fs.writeFile(absoluteUploadPath(newRelative), buffer);
    } catch (e) {
      if (e instanceof Error) return { error: e.message };
      throw e;
    }
  }

  await pool.query(
    `UPDATE students SET
      preferred_name = $2,
      phonetic_spelling = $3,
      pronouns = $4,
      fun_fact = $5,
      photo_path = COALESCE($6, photo_path),
      consent_confirmed_at = now(),
      updated_at = now()
    WHERE id = $1`,
    [
      studentId,
      preferredName,
      phonetic.length > 0 ? phonetic : null,
      pronouns,
      funFact,
      newRelative,
    ]
  );

  if (newRelative && oldPhoto && oldPhoto !== newRelative) {
    await unlinkQuiet(absoluteUploadPath(oldPhoto));
  }

  revalidatePath(`/dashboard/classes/${classId}`);
  return undefined;
}

export async function deleteStudentSelf(token: string): Promise<void> {
  const hash = hashEditToken(token);
  const pool = getPool();
  const { rows } = await pool.query<{
    id: string;
    class_id: string;
    photo_path: string | null;
  }>(`SELECT id, class_id, photo_path FROM students WHERE edit_token_hash = $1`, [hash]);
  const row = rows[0];
  if (!row) {
    redirect("/join");
  }

  const classId = row.class_id;
  await pool.query(`DELETE FROM students WHERE id = $1`, [row.id]);
  if (row.photo_path) {
    await unlinkQuiet(absoluteUploadPath(row.photo_path));
  }
  await rmDirQuiet(path.join(getUploadRoot(), "students", row.id));
  revalidatePath(`/dashboard/classes/${classId}`);
  redirect("/join");
}

"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hashEditToken } from "@/lib/edit-token";
import { getPool } from "@/lib/db";
import { studentPhotoToJpegBuffer } from "@/lib/process-student-photo";
import { assertNameAudio, audioExtensionFor } from "@/lib/process-name-audio";
import {
  absoluteUploadPath,
  ensureDir,
  getUploadRoot,
  rmDirQuiet,
  unlinkQuiet,
} from "@/lib/uploads";

export type StudentEditState = { error: string } | undefined;

function takeString(formData: FormData, key: string): string | null {
  const raw = String(formData.get(key) ?? "").trim();
  return raw.length > 0 ? raw : null;
}

export async function updateStudentProfile(
  token: string,
  _prev: StudentEditState,
  formData: FormData
): Promise<StudentEditState> {
  const hash = hashEditToken(token);
  const consent = formData.get("consent");
  if (consent !== "on" && consent !== "true") {
    return {
      error: "Please confirm you're okay sharing this information with your professor.",
    };
  }

  const preferredName = takeString(formData, "preferred_name");
  const phonetic = takeString(formData, "phonetic_spelling");
  const pronouns = takeString(formData, "pronouns");
  const funFact = takeString(formData, "fun_fact");
  const hometown = takeString(formData, "hometown");
  const major = takeString(formData, "major");
  const favoriteFood = takeString(formData, "favorite_food");
  const weekendActivity = takeString(formData, "weekend_activity");
  const superpower = takeString(formData, "superpower");

  const rawPhoto = formData.get("photo");
  const rawAudio = formData.get("name_audio");

  const pool = getPool();
  const { rows } = await pool.query<{
    id: string;
    class_id: string;
    photo_path: string | null;
    name_audio_path: string | null;
  }>(
    `SELECT id, class_id, photo_path, name_audio_path FROM students WHERE edit_token_hash = $1`,
    [hash]
  );
  const row = rows[0];
  if (!row) {
    return { error: "This edit link is no longer valid." };
  }

  const studentId = row.id;
  const classId = row.class_id;
  const oldPhoto = row.photo_path;
  const oldAudio = row.name_audio_path;
  const replacePhoto =
    rawPhoto instanceof File && rawPhoto.size > 0 ? rawPhoto : null;
  const replaceAudio =
    rawAudio instanceof File && rawAudio.size > 0 ? rawAudio : null;

  let newPhotoRelative: string | null = null;
  if (replacePhoto) {
    try {
      const buffer = await studentPhotoToJpegBuffer(replacePhoto);
      const fileName = `photo-${randomUUID()}.jpg`;
      newPhotoRelative = `students/${studentId}/${fileName}`;
      await ensureDir(absoluteUploadPath(`students/${studentId}`));
      await fs.writeFile(absoluteUploadPath(newPhotoRelative), buffer);
    } catch (e) {
      if (e instanceof Error) return { error: e.message };
      throw e;
    }
  }

  let newAudioRelative: string | null = null;
  if (replaceAudio) {
    try {
      assertNameAudio(replaceAudio);
      const ext = audioExtensionFor(replaceAudio);
      const fileName = `name-${randomUUID()}.${ext}`;
      newAudioRelative = `students/${studentId}/${fileName}`;
      await ensureDir(absoluteUploadPath(`students/${studentId}`));
      await fs.writeFile(
        absoluteUploadPath(newAudioRelative),
        Buffer.from(await replaceAudio.arrayBuffer())
      );
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
      hometown = $6,
      major = $7,
      favorite_food = $8,
      weekend_activity = $9,
      superpower = $10,
      photo_path = COALESCE($11, photo_path),
      name_audio_path = COALESCE($12, name_audio_path),
      consent_confirmed_at = now(),
      updated_at = now()
    WHERE id = $1`,
    [
      studentId,
      preferredName,
      phonetic,
      pronouns,
      funFact,
      hometown,
      major,
      favoriteFood,
      weekendActivity,
      superpower,
      newPhotoRelative,
      newAudioRelative,
    ]
  );

  if (newPhotoRelative && oldPhoto && oldPhoto !== newPhotoRelative) {
    await unlinkQuiet(absoluteUploadPath(oldPhoto));
  }
  if (newAudioRelative && oldAudio && oldAudio !== newAudioRelative) {
    await unlinkQuiet(absoluteUploadPath(oldAudio));
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
    name_audio_path: string | null;
  }>(
    `SELECT id, class_id, photo_path, name_audio_path FROM students WHERE edit_token_hash = $1`,
    [hash]
  );
  const row = rows[0];
  if (!row) {
    redirect("/join");
  }

  const classId = row.class_id;
  await pool.query(`DELETE FROM students WHERE id = $1`, [row.id]);
  if (row.photo_path) {
    await unlinkQuiet(absoluteUploadPath(row.photo_path));
  }
  if (row.name_audio_path) {
    await unlinkQuiet(absoluteUploadPath(row.name_audio_path));
  }
  await rmDirQuiet(path.join(getUploadRoot(), "students", row.id));
  revalidatePath(`/dashboard/classes/${classId}`);
  redirect("/join");
}

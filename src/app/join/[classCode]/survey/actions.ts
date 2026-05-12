"use server";

import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { generateEditToken, hashEditToken } from "@/lib/edit-token";
import { getPool } from "@/lib/db";
import { normalizeClassCode } from "@/lib/class-code";
import { studentPhotoToJpegBuffer } from "@/lib/process-student-photo";
import { assertNameAudio, audioExtensionFor } from "@/lib/process-name-audio";
import { allowSurveySubmit } from "@/lib/survey-rate-limit";
import {
  absoluteUploadPath,
  ensureDir,
  unlinkQuiet,
} from "@/lib/uploads";

export type SurveyFormState =
  | { error: string }
  | { success: true; editPath: string }
  | undefined;

async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  const fromFwd = fwd?.split(",")[0]?.trim();
  return fromFwd || h.get("x-real-ip") || "unknown";
}

function takeString(formData: FormData, key: string): string | null {
  const raw = String(formData.get(key) ?? "").trim();
  return raw.length > 0 ? raw : null;
}

export async function submitSurvey(
  classCodeRaw: string,
  _prev: SurveyFormState,
  formData: FormData
): Promise<SurveyFormState> {
  if (!allowSurveySubmit(await getClientIp())) {
    return {
      error: "Too many submissions. Wait a minute and try again.",
    };
  }

  const code = normalizeClassCode(classCodeRaw);
  if (code.length !== 6) {
    return { error: "Invalid class link." };
  }

  const consent = formData.get("consent");
  if (consent !== "on" && consent !== "true") {
    return {
      error: "Please confirm you're okay sharing this information with your professor.",
    };
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

  const rawPhoto = formData.get("photo");
  const rawAudio = formData.get("name_audio");

  if (!legalName) {
    return { error: "Your legal name is required." };
  }
  if (!(rawPhoto instanceof File) || rawPhoto.size === 0) {
    return { error: "Please add a photo of yourself." };
  }

  const pool = getPool();
  const { rows: clsRows } = await pool.query<{ id: string }>(
    `SELECT id FROM classes WHERE class_code = $1`,
    [code]
  );
  const cls = clsRows[0];
  if (!cls) {
    return { error: "This class code is no longer valid." };
  }
  const classId = cls.id;

  // Process photo (and audio if provided) before any DB writes so a bad upload
  // never produces a half-saved student row.
  let photoBuffer: Buffer;
  try {
    photoBuffer = await studentPhotoToJpegBuffer(rawPhoto);
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }

  let audioBuffer: Buffer | null = null;
  let audioExt: string | null = null;
  if (rawAudio instanceof File && rawAudio.size > 0) {
    try {
      assertNameAudio(rawAudio);
      audioBuffer = Buffer.from(await rawAudio.arrayBuffer());
      audioExt = audioExtensionFor(rawAudio);
    } catch (e) {
      if (e instanceof Error) return { error: e.message };
      throw e;
    }
  }

  const editToken = generateEditToken();
  const tokenHash = hashEditToken(editToken);
  const nowSql = new Date();

  const matchRows = await pool.query<{ id: string }>(
    `SELECT id FROM students
     WHERE class_id = $1
       AND source = 'csv'
       AND survey_submitted_at IS NULL
       AND lower(trim(legal_name)) = lower(trim($2::text))`,
    [classId, legalName]
  );
  const matches = matchRows.rows;

  // Resolve to a single student id (match or fresh insert), then write files.
  const client = await pool.connect();
  let resolvedStudentId: string | null = null;
  let prevPhotoPath: string | null = null;
  let prevAudioPath: string | null = null;

  try {
    await client.query("BEGIN");

    if (matches.length === 1) {
      resolvedStudentId = matches[0]!.id;
      const { rows: prev } = await client.query<{
        photo_path: string | null;
        name_audio_path: string | null;
      }>(
        `SELECT photo_path, name_audio_path FROM students WHERE id = $1 FOR UPDATE`,
        [resolvedStudentId]
      );
      prevPhotoPath = prev[0]?.photo_path ?? null;
      prevAudioPath = prev[0]?.name_audio_path ?? null;
    } else {
      const submissionReview =
        matches.length === 0 ? "no_roster_match" : "ambiguous_roster_match";

      const { rows: ins } = await client.query<{ id: string }>(
        `INSERT INTO students (
           class_id, legal_name, source, consent_confirmed_at,
           survey_submitted_at, edit_token_hash, submission_review
         )
         VALUES ($1, $2, 'survey', $3, $4, $5, $6)
         RETURNING id`,
        [classId, legalName, nowSql, nowSql, tokenHash, submissionReview]
      );
      resolvedStudentId = ins[0]!.id;
    }

    const studentDir = `students/${resolvedStudentId}`;
    await ensureDir(absoluteUploadPath(studentDir));

    const photoRelative = `${studentDir}/photo-${randomUUID()}.jpg`;
    await fs.writeFile(absoluteUploadPath(photoRelative), photoBuffer);

    let audioRelative: string | null = null;
    if (audioBuffer && audioExt) {
      audioRelative = `${studentDir}/name-${randomUUID()}.${audioExt}`;
      await fs.writeFile(absoluteUploadPath(audioRelative), audioBuffer);
    }

    await client.query(
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
         photo_path = $11,
         name_audio_path = COALESCE($12, name_audio_path),
         consent_confirmed_at = $13,
         survey_submitted_at = $14,
         edit_token_hash = $15,
         submission_review = CASE WHEN submission_review IS NOT NULL
                                  THEN submission_review
                                  ELSE NULL END
       WHERE id = $1`,
      [
        resolvedStudentId,
        preferredName,
        phonetic,
        pronouns,
        funFact,
        hometown,
        major,
        favoriteFood,
        weekendActivity,
        superpower,
        photoRelative,
        audioRelative,
        nowSql,
        nowSql,
        tokenHash,
      ]
    );

    await client.query("COMMIT");

    // After commit, clean up any photo/audio the old row pointed at.
    if (prevPhotoPath && prevPhotoPath !== photoRelative) {
      await unlinkQuiet(absoluteUploadPath(prevPhotoPath));
    }
    if (audioRelative && prevAudioPath && prevAudioPath !== audioRelative) {
      await unlinkQuiet(absoluteUploadPath(prevAudioPath));
    }

    revalidatePath(`/dashboard/classes/${classId}`);
    return { success: true, editPath: `/student/${editToken}` };
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

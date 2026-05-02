"use server";

import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { generateEditToken, hashEditToken } from "@/lib/edit-token";
import { getPool } from "@/lib/db";
import { normalizeClassCode } from "@/lib/class-code";
import { studentPhotoToJpegBuffer } from "@/lib/process-student-photo";
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
      error: "You must confirm that a parent/guardian approved sharing this information.",
    };
  }

  const legalName = String(formData.get("legal_name") ?? "").trim();
  const preferredName = String(formData.get("preferred_name") ?? "").trim();
  const phonetic = String(formData.get("phonetic_spelling") ?? "").trim();
  const pronouns = String(formData.get("pronouns") ?? "").trim();
  const funFact = String(formData.get("fun_fact") ?? "").trim();
  const rawPhoto = formData.get("photo");

  if (
    !legalName ||
    !preferredName ||
    !pronouns ||
    !funFact ||
    !(rawPhoto instanceof File) ||
    rawPhoto.size === 0
  ) {
    return {
      error: "Fill every field and upload a photo.",
    };
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

  let photoBuffer: Buffer;
  try {
    photoBuffer = await studentPhotoToJpegBuffer(rawPhoto);
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
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

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (matches.length === 1) {
      const studentId = matches[0]!.id;
      const { rows: prevRows } = await client.query<{ photo_path: string | null }>(
        `SELECT photo_path FROM students WHERE id = $1 FOR UPDATE`,
        [studentId]
      );
      const oldPath = prevRows[0]?.photo_path ?? null;

      const fileName = `photo-${randomUUID()}.jpg`;
      const relative = `students/${studentId}/${fileName}`;
      await ensureDir(absoluteUploadPath(`students/${studentId}`));
      await fs.writeFile(absoluteUploadPath(relative), photoBuffer);

      await client.query(
        `UPDATE students SET
          preferred_name = $2,
          phonetic_spelling = $3,
          pronouns = $4,
          fun_fact = $5,
          photo_path = $6,
          consent_confirmed_at = $7,
          survey_submitted_at = $8,
          edit_token_hash = $9,
          submission_review = NULL
        WHERE id = $1`,
        [
          studentId,
          preferredName,
          phonetic.length > 0 ? phonetic : null,
          pronouns,
          funFact,
          relative,
          nowSql,
          nowSql,
          tokenHash,
        ]
      );

      await client.query("COMMIT");

      if (oldPath && oldPath !== relative) {
        await unlinkQuiet(absoluteUploadPath(oldPath));
      }

      revalidatePath(`/dashboard/classes/${classId}`);
      return { success: true, editPath: `/student/${editToken}` };
    }

    let submissionReview: "no_roster_match" | "ambiguous_roster_match";
    if (matches.length === 0) {
      submissionReview = "no_roster_match";
    } else {
      submissionReview = "ambiguous_roster_match";
    }

    const { rows: ins } = await client.query<{ id: string }>(
      `INSERT INTO students (
        class_id, legal_name, preferred_name, phonetic_spelling, pronouns, fun_fact,
        source, consent_confirmed_at, survey_submitted_at, edit_token_hash, submission_review
      ) VALUES ($1, $2, $3, $4, $5, $6, 'survey', $7, $8, $9, $10)
      RETURNING id`,
      [
        classId,
        legalName,
        preferredName,
        phonetic.length > 0 ? phonetic : null,
        pronouns,
        funFact,
        nowSql,
        nowSql,
        tokenHash,
        submissionReview,
      ]
    );
    const studentId = ins[0]!.id;

    const fileName = `photo-${randomUUID()}.jpg`;
    const relative = `students/${studentId}/${fileName}`;
    await ensureDir(absoluteUploadPath(`students/${studentId}`));
    await fs.writeFile(absoluteUploadPath(relative), photoBuffer);

    await client.query(`UPDATE students SET photo_path = $1 WHERE id = $2`, [
      relative,
      studentId,
    ]);

    await client.query("COMMIT");
    revalidatePath(`/dashboard/classes/${classId}`);
    return { success: true, editPath: `/student/${editToken}` };
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

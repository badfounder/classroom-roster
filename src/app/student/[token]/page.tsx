import { notFound } from "next/navigation";
import { hashEditToken } from "@/lib/edit-token";
import { getPool } from "@/lib/db";
import { StudentEditForm } from "./student-edit-form";

export default async function StudentEditPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) {
    notFound();
  }

  const hash = hashEditToken(token);
  const pool = getPool();
  const { rows } = await pool.query<{
    legal_name: string;
    preferred_name: string | null;
    phonetic_spelling: string | null;
    pronouns: string | null;
    fun_fact: string | null;
    photo_path: string | null;
    survey_submitted_at: Date | null;
  }>(
    `SELECT legal_name, preferred_name, phonetic_spelling, pronouns, fun_fact, photo_path, survey_submitted_at
     FROM students WHERE edit_token_hash = $1`,
    [hash]
  );
  const s = rows[0];
  if (!s?.survey_submitted_at) {
    notFound();
  }

  const photoSrc = s.photo_path
    ? `/api/student/${encodeURIComponent(token)}/photo`
    : null;

  return (
    <StudentEditForm
      token={token}
      legalName={s.legal_name}
      preferredName={s.preferred_name ?? ""}
      phonetic={s.phonetic_spelling}
      pronouns={s.pronouns ?? ""}
      funFact={s.fun_fact ?? ""}
      photoSrc={photoSrc}
    />
  );
}

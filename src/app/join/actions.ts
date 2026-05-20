"use server";

import { redirect } from "next/navigation";
import { normalizeClassCode } from "@/lib/class-code";
import { getPool } from "@/lib/db";

export type JoinFormState = { error: string; code: string } | undefined;

export async function submitClassCode(
  _prev: JoinFormState,
  formData: FormData
): Promise<JoinFormState> {
  const raw = String(formData.get("code") ?? "");
  const code = normalizeClassCode(raw);
  // Echo the typed value back so the form can re-populate the input on error
  // (otherwise people have to retype the whole code from scratch).
  if (raw.trim().length === 0) {
    return { error: "Enter the class code your teacher gave you.", code: raw };
  }
  if (code.length !== 6) {
    return {
      error: "Class codes are 6 characters. Check for missing or extra characters.",
      code: raw,
    };
  }

  const pool = getPool();
  const { rowCount } = await pool.query(
    `SELECT 1 FROM classes WHERE class_code = $1`,
    [code]
  );
  if (!rowCount) {
    return {
      error: `“${code}” isn't a valid class code. Double-check the code your teacher shared — letters and numbers only, no spaces.`,
      code: raw,
    };
  }

  redirect(`/join/${code}`);
}

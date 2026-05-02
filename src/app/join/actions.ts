"use server";

import { redirect } from "next/navigation";
import { normalizeClassCode } from "@/lib/class-code";
import { getPool } from "@/lib/db";

export type JoinFormState = { error: string } | undefined;

export async function submitClassCode(
  _prev: JoinFormState,
  formData: FormData
): Promise<JoinFormState> {
  const raw = String(formData.get("code") ?? "");
  const code = normalizeClassCode(raw);
  if (code.length !== 6) {
    return {
      error: "Enter the 6-character class code exactly as your teacher shared.",
    };
  }

  const pool = getPool();
  const { rowCount } = await pool.query(
    `SELECT 1 FROM classes WHERE class_code = $1`,
    [code]
  );
  if (!rowCount) {
    return { error: "That class code is not valid." };
  }

  redirect(`/join/${code}`);
}

"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getPool } from "@/lib/db";

export type RegisterState = { error: string } | undefined;

export async function registerTeacher(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nameRaw = String(formData.get("name") ?? "").trim();
  const name = nameRaw.length > 0 ? nameRaw : null;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const hash = await bcrypt.hash(password, 12);
  const pool = getPool();
  try {
    await pool.query(
      `INSERT INTO teachers (email, password_hash, name) VALUES ($1, $2, $3)`,
      [email, hash, name]
    );
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: string }).code)
        : "";
    if (code === "23505") {
      return { error: "An account with this email already exists." };
    }
    throw e;
  }

  redirect("/login?registered=1");
}

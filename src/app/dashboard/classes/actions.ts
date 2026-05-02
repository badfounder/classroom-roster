"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { randomClassCode } from "@/lib/class-code";
import { getPool } from "@/lib/db";
import { classroomPhotoToJpegBuffer } from "@/lib/process-classroom-photo";
import {
  absoluteUploadPath,
  ensureDir,
  getUploadRoot,
  rmDirQuiet,
  unlinkQuiet,
} from "@/lib/uploads";

export type ClassFormState = { error: string } | undefined;

function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "23505"
  );
}

async function requireTeacherId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) {
    redirect("/login");
  }
  return id;
}

export async function createClass(
  _prev: ClassFormState,
  formData: FormData
): Promise<ClassFormState> {
  const teacherId = await requireTeacherId();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Class name is required." };
  }

  const rawFile = formData.get("classroomPhoto");
  const photo =
    rawFile instanceof File && rawFile.size > 0 ? rawFile : null;

  const pool = getPool();
  const client = await pool.connect();
  let classId: string | null = null;

  try {
    await client.query("BEGIN");

    for (let attempt = 0; attempt < 40; attempt++) {
      const code = randomClassCode();
      try {
        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO classes (teacher_id, name, class_code)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [teacherId, name, code]
        );
        classId = rows[0]!.id;
        break;
      } catch (e) {
        if (isUniqueViolation(e)) continue;
        throw e;
      }
    }

    if (!classId) {
      await client.query("ROLLBACK");
      return { error: "Could not allocate a class code. Try again." };
    }

    if (photo) {
      try {
        const buffer = await classroomPhotoToJpegBuffer(photo);
        const fileName = `classroom-${randomUUID()}.jpg`;
        const relative = `classes/${classId}/${fileName}`;
        const dir = absoluteUploadPath(`classes/${classId}`);
        await ensureDir(dir);
        await fs.writeFile(absoluteUploadPath(relative), buffer);
        await client.query(
          `UPDATE classes SET classroom_photo_path = $1 WHERE id = $2`,
          [relative, classId]
        );
      } catch (e) {
        await client.query("ROLLBACK");
        if (e instanceof Error) {
          return { error: e.message };
        }
        throw e;
      }
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }

  if (!classId) {
    return { error: "Could not create class." };
  }
  redirect(`/dashboard/classes/${classId}`);
}

export async function updateClassName(
  classId: string,
  _prev: ClassFormState,
  formData: FormData
): Promise<ClassFormState> {
  const teacherId = await requireTeacherId();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Class name is required." };
  }

  const pool = getPool();
  const { rowCount } = await pool.query(
    `UPDATE classes SET name = $1 WHERE id = $2 AND teacher_id = $3`,
    [name, classId, teacherId]
  );
  if (!rowCount) {
    return { error: "Class not found." };
  }
  redirect(`/dashboard/classes/${classId}`);
}

export async function rotateClassCode(classId: string): Promise<void> {
  const teacherId = await requireTeacherId();
  const pool = getPool();

  for (let attempt = 0; attempt < 40; attempt++) {
    const code = randomClassCode();
    try {
      const { rowCount } = await pool.query(
        `UPDATE classes SET class_code = $1 WHERE id = $2 AND teacher_id = $3`,
        [code, classId, teacherId]
      );
      if (rowCount === 0) {
        redirect("/dashboard");
      }
      redirect(`/dashboard/classes/${classId}`);
    } catch (e) {
      if (isUniqueViolation(e)) continue;
      throw e;
    }
  }
  redirect(`/dashboard/classes/${classId}`);
}

export async function replaceClassroomPhoto(
  classId: string,
  _prev: ClassFormState,
  formData: FormData
): Promise<ClassFormState> {
  const teacherId = await requireTeacherId();
  const rawFile = formData.get("photo");
  const file = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;
  if (!file) {
    return { error: "Choose a JPEG or PNG file." };
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ classroom_photo_path: string | null }>(
      `SELECT classroom_photo_path FROM classes WHERE id = $1 AND teacher_id = $2 FOR UPDATE`,
      [classId, teacherId]
    );
    const row = rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return { error: "Class not found." };
    }

    let buffer: Buffer;
    try {
      buffer = await classroomPhotoToJpegBuffer(file);
    } catch (e) {
      await client.query("ROLLBACK");
      if (e instanceof Error) return { error: e.message };
      throw e;
    }

    const fileName = `classroom-${randomUUID()}.jpg`;
    const relative = `classes/${classId}/${fileName}`;
    const dir = absoluteUploadPath(`classes/${classId}`);
    await ensureDir(dir);
    const full = absoluteUploadPath(relative);
    await fs.writeFile(full, buffer);

    await client.query(
      `UPDATE classes SET classroom_photo_path = $1 WHERE id = $2`,
      [relative, classId]
    );
    await client.query("COMMIT");

    const oldPath = row.classroom_photo_path;
    if (oldPath && oldPath !== relative) {
      await unlinkQuiet(absoluteUploadPath(oldPath));
    }
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }

  redirect(`/dashboard/classes/${classId}`);
}

export async function deleteClass(classId: string): Promise<void> {
  const teacherId = await requireTeacherId();
  const pool = getPool();
  const client = await pool.connect();

  let classroomPath: string | null = null;
  const studentDirs: { id: string; photo_path: string | null }[] = [];

  try {
    await client.query("BEGIN");
    const { rows: clsRows } = await client.query<{
      classroom_photo_path: string | null;
    }>(
      `SELECT classroom_photo_path FROM classes WHERE id = $1 AND teacher_id = $2 FOR UPDATE`,
      [classId, teacherId]
    );
    if (!clsRows[0]) {
      await client.query("ROLLBACK");
      redirect("/dashboard");
    }
    classroomPath = clsRows[0].classroom_photo_path;

    const { rows: stRows } = await client.query<{
      id: string;
      photo_path: string | null;
    }>(`SELECT id, photo_path FROM students WHERE class_id = $1`, [classId]);
    studentDirs.push(...stRows);

    await client.query(`DELETE FROM classes WHERE id = $1`, [classId]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }

  const root = getUploadRoot();
  for (const s of studentDirs) {
    if (s.photo_path) {
      await unlinkQuiet(absoluteUploadPath(s.photo_path));
    }
    await rmDirQuiet(path.join(root, "students", s.id));
  }
  if (classroomPath) {
    await unlinkQuiet(absoluteUploadPath(classroomPath));
  }
  await rmDirQuiet(path.join(root, "classes", classId));

  redirect("/dashboard");
}

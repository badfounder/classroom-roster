/**
 * One-off seed for local dev: drops in a demo teacher account, one class with
 * a known code, and ~10 students in varying submission states so the UI
 * actually has something to render.
 *
 * Idempotent: safe to re-run. Re-running resets the teacher password to the
 * known value and re-inserts any students that are missing from the class.
 *
 * Usage:
 *   node scripts/seed-demo.mjs
 *
 * Prints sign-in credentials and the class join URLs at the end.
 */
import dotenv from "dotenv";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local") });

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "demo-password-12";
const DEMO_NAME = "Demo Teacher";
const CLASS_NAME = "Period 3 Biology (Demo)";
const CLASS_CODE = "DEMO42"; // 6 chars, valid alphabet (no 0/O/1/I/L)

const STUDENTS = [
  {
    legal_name: "Aaliyah Okonkwo",
    preferred_name: "Aaliyah",
    phonetic_spelling: "ah-LEE-uh",
    pronouns: "she/her",
    fun_fact: "Plays trumpet in the school jazz band.",
    submitted: true,
  },
  {
    legal_name: "Benjamin Chen",
    preferred_name: "Ben",
    phonetic_spelling: null,
    pronouns: "he/him",
    fun_fact: "Has visited 14 national parks and is working on the rest.",
    submitted: true,
  },
  {
    legal_name: "Camila Reyes",
    preferred_name: "Cami",
    phonetic_spelling: "KAH-mee",
    pronouns: "she/her",
    fun_fact: "Bakes sourdough every weekend.",
    submitted: true,
  },
  {
    legal_name: "Devon Brooks",
    preferred_name: "Devon",
    phonetic_spelling: null,
    pronouns: "they/them",
    fun_fact: "Captain of the robotics team.",
    submitted: true,
  },
  {
    legal_name: "Elena Petrov",
    preferred_name: "Lena",
    phonetic_spelling: "LEH-nuh",
    pronouns: "she/her",
    fun_fact: "Speaks four languages, trying to add Japanese.",
    submitted: true,
  },
  {
    legal_name: "Finn Murphy",
    preferred_name: "Finn",
    phonetic_spelling: null,
    pronouns: "he/him",
    fun_fact: "Competitive chess player since age 6.",
    submitted: true,
  },
  {
    legal_name: "Grace Hollister",
    preferred_name: "Gracie",
    phonetic_spelling: null,
    pronouns: "she/her",
    fun_fact: "Volunteer at the local animal shelter on Sundays.",
    submitted: true,
  },
  // These are pre-populated from a CSV upload but haven't submitted the survey.
  { legal_name: "Hiroshi Tanaka", submitted: false },
  { legal_name: "Isabela Santos", submitted: false },
  { legal_name: "Jamal Washington", submitted: false },
];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const { rows: teacherRows } = await client.query(
      `INSERT INTO teachers (email, password_hash, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             name = EXCLUDED.name
       RETURNING id`,
      [DEMO_EMAIL, passwordHash, DEMO_NAME]
    );
    const teacherId = teacherRows[0].id;

    let classId;
    const { rows: existingClass } = await client.query(
      `SELECT id FROM classes WHERE class_code = $1 AND teacher_id = $2`,
      [CLASS_CODE, teacherId]
    );
    if (existingClass[0]) {
      classId = existingClass[0].id;
      await client.query(
        `UPDATE classes SET name = $1 WHERE id = $2`,
        [CLASS_NAME, classId]
      );
    } else {
      const { rows } = await client.query(
        `INSERT INTO classes (teacher_id, name, class_code)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [teacherId, CLASS_NAME, CLASS_CODE]
      );
      classId = rows[0].id;
    }

    let inserted = 0;
    for (const s of STUDENTS) {
      // Skip if a row with this legal_name already exists in this class.
      const { rowCount: existing } = await client.query(
        `SELECT 1 FROM students
         WHERE class_id = $1 AND lower(trim(legal_name)) = lower(trim($2))`,
        [classId, s.legal_name]
      );
      if (existing) continue;

      const editToken = s.submitted
        ? crypto.randomBytes(24).toString("hex")
        : null;
      const editTokenHash = editToken
        ? crypto.createHash("sha256").update(editToken).digest("hex")
        : null;

      await client.query(
        `INSERT INTO students (
           class_id, legal_name, preferred_name, phonetic_spelling, pronouns,
           fun_fact, source, survey_submitted_at, consent_confirmed_at,
           edit_token_hash
         )
         VALUES (
           $1, $2, $3, $4, $5, $6,
           $7,
           CASE WHEN $8::boolean THEN now() - (random() * interval '6 days') ELSE NULL END,
           CASE WHEN $8::boolean THEN now() ELSE NULL END,
           $9
         )`,
        [
          classId,
          s.legal_name,
          s.preferred_name ?? null,
          s.phonetic_spelling ?? null,
          s.pronouns ?? null,
          s.fun_fact ?? null,
          s.submitted ? "survey" : "csv",
          s.submitted,
          editTokenHash,
        ]
      );
      inserted += 1;
    }

    await client.query("COMMIT");

    console.log("✅ Demo seed complete.\n");
    console.log("Teacher sign-in:");
    console.log(`  URL:      http://localhost:3000/login`);
    console.log(`  Email:    ${DEMO_EMAIL}`);
    console.log(`  Password: ${DEMO_PASSWORD}\n`);
    console.log("Class:");
    console.log(`  Name: ${CLASS_NAME}`);
    console.log(`  Code: ${CLASS_CODE}`);
    console.log(`  Inserted ${inserted} new student row(s) (already present rows skipped).\n`);
    console.log("Student flow (open in incognito or a different browser):");
    console.log(`  Survey: http://localhost:3000/join/${CLASS_CODE}/survey`);
    console.log(`  Join page: http://localhost:3000/join  (enter ${CLASS_CODE})`);
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

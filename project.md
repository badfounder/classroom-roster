# Classroom Roster & Seating Chart — Product Requirements (v3)

## Overview

A self-hosted web app that helps teachers learn their students' names, faces, and personal details quickly, while providing a visual seating chart based on the actual classroom layout.

## Problem

- Teachers struggle to learn names and pronunciations early in the term.
- Traditional rosters are flat text lists that don't reflect real seating arrangements.
- Existing tools are generic, expensive, or don't give teachers control over their data.

## Users

- **Primary — Teachers.** Manage classes, build seating charts, learn student details. Initially a single teacher (the author); architected so additional teachers can be added in v2.
- **Secondary — Students.** Fill out a profile once via a class code. May revisit occasionally to update. Can see only their own entry — never other students' submissions.

## Success Criteria (v1)

The app is successful for v1 if **all** of the following are true by the end of the second week of a term:

- The teacher can name every student in every class without prompting.
- The teacher can correctly pronounce every preferred name.
- 90%+ of students complete their profile within the first week of receiving the class code.
- Zero data loss incidents (no photos or rosters lost to bugs, crashes, or restarts).
- Setting up a new class (create + upload roster + share code + receive submissions) takes under 10 minutes of teacher time.

These are personal targets, not external metrics — but writing them down makes scope decisions for v1.1 and v2 honest.

## Assumptions & Scale (v1)

- One teacher (the author).
- Up to ~6 classes, ~35 students each (~210 students total).
- Each student has one photo, ≤5 MB pre-processing.
- Each class has one classroom background photo, ≤10 MB.
- Concurrent load: trivially low (a handful of students filling forms simultaneously at most).
- Hosted on a single VPS with local disk; no horizontal scaling needed.

These assumptions justify simple choices (raw SQL, local filesystem, no caching layer). v2 multi-tenant scale will need to be re-examined.

## Goals (v1)

1. Student onboarding survey that captures the data teachers need to learn names and faces.
2. Class management for teachers (create, edit, delete classes; add/remove students; upload roster CSV).
3. Visual seating chart anchored to a real photo of the classroom.
4. Lightweight student access — no account creation, no email required.
5. Self-hosted: all data and files live on the teacher's VPS.

## Non-Goals (v1)

- No grading, attendance, or messaging.
- No native mobile apps (responsive web is sufficient).
- No advanced analytics or reporting.
- No teacher-to-teacher sharing or class import/export.
- No real-time collaboration (one teacher edits one chart at a time).

## Privacy & Consent

This app collects photos and personal details of students, often minors. Privacy is a precondition, not a feature.

**Decisions for v1:**

- Consent collection is handled **outside the app** via the school's existing photo/data release process. The teacher is responsible for confirming consent before sharing a class code with any student.
- The app surfaces a consent confirmation checkbox on the student form ("My parent/guardian has approved sharing this information with my teacher") as a soft secondary check — not a substitute for the school process.
- EXIF metadata is stripped from all uploaded photos server-side before storage. Geolocation in iPhone photos is a real leak vector.
- All photos are served behind authentication — never via predictable public URLs.
- **Students see only their own entry**, accessed via their personal edit token. Class codes alone never expose other students' data.
- Students can delete their own profile via their edit token at any time. Deletion removes the database row and the photo file on disk.
- The teacher can export a class roster (JSON) and delete a class, which cascades to all student data and files.
- No third-party analytics, no telemetry, no external requests carrying student data.

**Open for the teacher to confirm with their school:** FERPA / GDPR / provincial privacy law applicability, whether parental consent forms must be retained, and any retention limits.

## User Flows

### Flow 1 — Teacher first-time setup

1. Teacher signs up via Auth.js (email + password).
2. Lands on empty dashboard with a "Create your first class" CTA.
3. Creates a class (name, optional description) → system generates a class code.
4. Optionally uploads a classroom photo for the seating chart background.
5. Optionally uploads a roster CSV to pre-populate students (see Flow 6).
6. Copies the class code and the student form URL to share with students (email, LMS, slide).
7. Returns later to view submissions as students complete the form.

### Flow 2 — Student profile submission

1. Student receives class code + URL from teacher.
2. Visits URL, enters class code.
3. Sees the form with a consent checkbox at the top.
4. Fills fields, uploads or captures a photo.
5. On submit, the system checks for a pre-populated row matching their legal name (case-insensitive, trimmed):
   - **Exact match:** updates the existing row, marks it as submitted.
   - **No match:** creates a new row, flags it for teacher review.
   - **Multiple matches:** flags for teacher review; student sees a generic "submission received" message.
6. Student sees a confirmation page with a personal edit link (token-based) they can bookmark.
7. The edit link is the only way to view or modify their entry. Re-entering the class code starts a new submission.

### Flow 3 — Teacher builds a seating chart

1. Teacher opens a class with submitted students.
2. Sees a sidebar of student cards (photo + preferred name) and the classroom photo as canvas.
3. Drags cards onto the photo. Position autosaves on drop.
4. Clicks a placed card to see full details (legal name, phonetic spelling, pronouns, fun fact).
5. Can remove a card from the chart (returns to sidebar) or delete a student entirely.

### Flow 4 — Mid-term student joins

1. Teacher shares the existing class code with the new student.
2. Student fills the form normally.
3. New student card appears in the sidebar (flagged as "no roster match" if a CSV was uploaded); teacher confirms and places them on the chart.

### Flow 5 — End of term

1. Teacher exports the class roster (JSON) for personal records if desired.
2. Teacher deletes the class → all student rows, seating positions, and photo files are removed from disk.
3. Manual filesystem audit script (provided as part of the project) verifies no orphaned files remain.

### Flow 6 — Roster CSV upload

1. Teacher downloads a CSV template (or uses their school's roster export).
2. Required column: `legal_name`. Optional columns: `preferred_name`, `pronouns`.
3. Teacher uploads the CSV from the class page.
4. System validates: required column present, no empty `legal_name` rows, no duplicate names within the file.
5. On success, creates one student row per CSV line with `survey_submitted_at = NULL` (awaiting submission).
6. Teacher sees a list of pre-populated students with an "awaiting submission" indicator.
7. As students submit the survey, matching rows transition to "submitted" and gain the survey fields.
8. Teacher can re-upload to add late additions; existing rows are not affected (matched by legal name).

## Features & Acceptance Criteria

### 1. Student Onboarding Survey

**Fields:** photo, legal name, preferred name, phonetic spelling, pronouns, fun fact, consent checkbox.

**Acceptance:**
- Form submits successfully with all fields filled and consent checked.
- Submission with consent unchecked is blocked with a clear error.
- Photo upload accepts JPEG, PNG, HEIC; rejects others with a clear message.
- HEIC is converted to JPEG server-side.
- Photos over 5 MB are rejected client-side before upload; resized server-side to max 1024px on the long edge.
- EXIF metadata is stripped before storage.
- Submitting issues an edit token bound to the student record.
- Visiting the edit URL with a valid token loads the student's existing entry for update.
- Student can delete their own entry via the edit URL.
- Submission attempts to match against pre-populated roster rows by legal name (see Flow 2).

### 2. Class Management

**Acceptance:**
- Teacher can create, rename, and delete classes.
- Deleting a class cascades to all students, seating positions, and photo files.
- Teacher can manually add a student (bypassing the survey) and edit any field.
- Teacher can remove a student; removal deletes their row, seating position, and photo file.
- Each class has a unique 6-character alphanumeric code (excluding visually ambiguous characters: 0/O, 1/I/l).
- Teacher can rotate a class code; the old code stops working immediately.
- Teacher can export a class roster as JSON.

### 3. Visual Seating Chart

**Acceptance:**
- Teacher can upload a classroom photo (JPEG/PNG, max 10 MB, resized to max 2048px on the long edge).
- Student cards appear in a sidebar; placed cards appear on the canvas.
- Cards can be dragged from sidebar to canvas, and within the canvas.
- Coordinates stored as percentages (0–100) of the canvas dimensions, so layout survives different viewport sizes.
- Position autosaves on drop (no explicit save button).
- Refresh restores the exact placement.
- Two cards may be placed at overlapping coordinates; visual stacking is acceptable for v1.
- Clicking a placed card opens a detail popover.
- Removing a card from the chart returns it to the sidebar without deleting the student.
- v1 is **mouse/touch only**. Keyboard-accessible drag is tracked as a v1.2 item, not v1.

### 4. Lightweight Student Access

**Acceptance:**
- Students access the form by entering a class code on a public URL.
- Invalid codes show a clear error.
- Codes are revocable and rotatable by the teacher.
- No password or email required from students.
- Students can only access their own entry, and only via their per-student edit token — never via the class code alone.

### 5. Self-Hosted File Storage

**Acceptance:**
- All photos stored on the VPS local filesystem.
- Files served only via authenticated Next.js API routes — never via direct static paths.
- Filenames are non-guessable (UUID-based), but URLs still go through auth checks.
- Deleting a class or student removes associated files from disk in the same flow (with a cleanup job that catches misses).

### 6. Roster CSV Upload

**Acceptance:**
- Teacher can upload a CSV from the class page.
- Required header: `legal_name`. Optional: `preferred_name`, `pronouns`.
- Validation rejects: missing required column, empty legal-name cells, duplicates within the file, files over 1 MB or more than 200 rows.
- On success, one student row is created per CSV line with `survey_submitted_at = NULL`.
- Re-uploading the CSV adds new rows for unmatched legal names; existing rows are not modified or duplicated.
- Pre-populated rows display as "awaiting submission" until a student submits the survey and matches.
- Submission matching is case-insensitive and trims surrounding whitespace.
- A teacher-facing review queue surfaces submissions with no match or multiple matches.

## Photo Handling (Cross-Cutting)

- **Accepted formats:** JPEG, PNG, HEIC (converted to JPEG).
- **Max upload size:** 5 MB student photos, 10 MB classroom photos.
- **Server-side processing:** EXIF strip, resize, re-encode as JPEG quality 85.
- **Storage filenames:** UUIDs, never user-supplied names.
- **Failure handling:** if upload or processing fails, the form submission fails atomically — no half-saved record with a missing photo.

## Class Code Security

Class codes are convenient but have known weaknesses. v1 accepts these trade-offs explicitly:

- Codes are guessable in principle (6 chars, ~30 billion combinations excluding ambiguous chars — fine for low-volume single-teacher use; revisit for v2).
- Anyone with the code can submit a profile. The teacher is the gatekeeper: they review submissions, especially the "no match" queue, and can delete fakes.
- Edit tokens are per-student and not derivable from the class code.
- The class code grants the right to *submit* a profile, never to *read* other profiles.
- Rate limiting on form submission (e.g., 5/minute per IP) protects against bulk fake submissions.
- For v2 multi-tenancy, consider per-student invite tokens layered on top of class codes.

## Accessibility

v1 commitments:

- All forms are keyboard-navigable and screen-reader-labeled.
- Color is not the sole carrier of information.
- The seating chart drag-and-drop is **mouse/touch only** in v1; this is a known accessibility gap.
- Alt text is auto-generated for student photos using preferred name ("Photo of [preferred name]").

v1.2 will add keyboard sensors (dnd-kit supports this) and a fallback list-based seating editor for keyboard users.

## Technical Decisions

| Layer | Choice | Notes |
|---|---|---|
| Frontend & API | Next.js + React | API routes co-located with UI |
| Database | Postgres via `pg`, raw SQL | No ORM; migrations as numbered SQL files |
| Drag & drop | dnd-kit | Mouse/touch sensors in v1; keyboard in v1.2 |
| Teacher auth | Auth.js | Email + password to start |
| Student auth | Class codes + per-student edit tokens | No full accounts |
| File storage | VPS local filesystem | Served via authenticated Next.js routes |
| Image processing | sharp | Resize, EXIF strip, HEIC → JPEG |
| CSV parsing | `csv-parse` | Streaming parser, server-side |
| Rate limiting | Simple in-memory or Postgres-backed | For form submissions |
| Backups | restic → Backblaze B2 | See Backup Strategy |

## Data Model

### `teachers`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| email | text unique not null | |
| password_hash | text not null | Managed by Auth.js |
| name | text | |
| created_at | timestamptz not null default now() | |

### `classes`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| teacher_id | uuid not null FK → teachers ON DELETE CASCADE | |
| name | text not null | |
| class_code | text unique not null | 6 chars, unambiguous alphabet |
| classroom_photo_path | text nullable | UUID-based filename |
| created_at | timestamptz not null default now() | |
| updated_at | timestamptz not null default now() | |

### `students`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| class_id | uuid not null FK → classes ON DELETE CASCADE | |
| legal_name | text not null | |
| preferred_name | text nullable | Null for pre-populated rows; required after submission |
| phonetic_spelling | text | |
| pronouns | text | |
| fun_fact | text | |
| photo_path | text nullable | UUID-based filename |
| edit_token_hash | text nullable | Null for pre-populated rows; set on submission |
| consent_confirmed_at | timestamptz | Timestamp of consent checkbox |
| survey_submitted_at | timestamptz nullable | Null = awaiting submission, populated via CSV |
| source | text not null default 'survey' | 'survey' or 'csv' — for review queue |
| created_at | timestamptz not null default now() | |
| updated_at | timestamptz not null default now() | |

**Indexes:** `(class_id, lower(trim(legal_name)))` for fast match lookup on submission.

**Note on v2 multi-class enrollment:** v1 binds a student to one class via FK. In v2 (same teacher, different periods, possibly same student), this becomes awkward. Options at that point: (a) introduce a `class_memberships` join table and migrate, or (b) accept duplication and add a `student_groups` concept. Decision deferred — flagged so it's not a surprise.

### `seating_positions`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| class_id | uuid not null FK → classes ON DELETE CASCADE | |
| student_id | uuid not null FK → students ON DELETE CASCADE | |
| x | numeric(5,2) not null | Percentage 0.00–100.00 |
| y | numeric(5,2) not null | Percentage 0.00–100.00 |
| updated_at | timestamptz not null default now() | |

**Constraint:** `UNIQUE (class_id, student_id)` — a student appears at most once on a class's chart.

### File cleanup

Postgres `ON DELETE CASCADE` does **not** remove files from disk. Every delete path must:

1. Read the photo paths before deletion.
2. Delete the database rows.
3. Delete the files from disk.

A nightly cleanup job scans the filesystem for orphaned files (paths not referenced by any row) and removes them as a safety net.

## File Storage Layout

```
/var/app/uploads/
├── classes/
│   └── {class_id}/
│       └── classroom-{uuid}.jpg
└── students/
    └── {student_id}/
        └── photo-{uuid}.jpg
```

Nesting under `{class_id}` and `{student_id}` makes deletion a single `rm -rf` of the directory and avoids name collisions. The trailing UUID in the filename allows photo replacement without filename reuse (avoids browser cache issues).

## Backup Strategy

**Goal:** survive a VPS loss (provider outage, accidental `rm -rf`, ransomware) with at most one day of data loss and a documented restore path.

**Recommendation: restic to Backblaze B2, daily.**

### Why restic + B2

- restic is a single Go binary, no system dependencies, runs from cron.
- Built-in AES-256 encryption, deduplication, and compression — backups are encrypted before leaving the VPS.
- Backblaze B2 is cheap (~$6/TB/month) and S3-compatible. This app's footprint is well under 1 GB even with photos, so cost is effectively rounding error.
- Off-site by default. Provider snapshots are convenient but live on the same provider; if your VPS host has an outage or terminates your account, those go with it.

### What gets backed up

1. **Postgres** — `pg_dump` to `/var/backups/pg/dump-{date}.sql.gz`, then included in the restic snapshot. Three days of dumps retained locally for fast restore.
2. **Uploads** — `/var/app/uploads/` snapshotted directly by restic.
3. **App config** — `/etc/app/` and any `.env` files (excluding secrets that should already live in a password manager).

### Schedule

- Nightly at 02:00 local: `pg_dump` → restic snapshot → `restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6` → `restic prune` (weekly).
- Backup script writes a timestamp to `/var/backups/last-success`; a simple monitoring check (cron + email or healthchecks.io) alerts if the file is over 26 hours old.

### Restore drill

- Quarterly: pull the latest snapshot to a scratch directory on a fresh VM, restore the Postgres dump, verify a known student record. Document any friction in `runbooks/restore.md`.
- A backup that has never been restored is not a backup.

### Key & credential management

- restic repository password and B2 credentials stored in `/etc/restic/env`, mode 0600, root-owned.
- A copy of the restic repository password is also stored offline (printed and filed, or in a password manager) — losing it means the backups are unrecoverable.

### Alternatives considered

- **Borg** instead of restic: equivalent feature set, slightly more mature; restic chosen for simpler binary distribution.
- **rsync to a second VPS**: simpler but no encryption at rest, and the second VPS is now also your problem.
- **VPS provider snapshots**: useful as a same-provider fast-restore option, not as a primary backup. Treat as a nice-to-have layer, not the strategy.

## Data Retention

- Student data persists until the teacher deletes the class or student, or the student self-deletes via their edit token.
- No automatic expiry in v1.
- v1.1 will add an end-of-term "archive class" action that deletes all photos and personal fields but retains an anonymized roster (preferred names only) for the teacher's records.

## Roadmap

- **v1** — Everything above. Phonetic spelling only.
- **v1.1** — Audio name pronunciation (record + playback on student card). Class archive action.
- **v1.2** — Keyboard-accessible drag and drop; list-based seating fallback.
- **v2** — Multi-tenancy: multiple teachers, data isolation, teacher invites, per-teacher quotas, revisit class code security model, address multi-class student enrollment.

## Open Questions

- Is there value in a "preview as student" mode for the teacher to verify the form before sharing? *(Deferred — decide during implementation.)*
- Should the teacher receive an email notification on each submission, or only check the dashboard? Email is simple to add and useful for the "no match" queue.
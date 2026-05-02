# Classroom Roster & Seating Chart — Product Backlog

Derived from [project.md](./project.md) (PRD v3).

---

## Vision & v1 definition of done

**North star:** Teachers learn names and faces using a seating chart tied to a real classroom photo; students onboard with a class code; all data stays on the teacher’s VPS without leaking student data to third parties.

**v1 success criteria (from PRD):**

- Teacher can name every student in every class without prompting.
- Teacher can correctly pronounce every preferred name.
- 90%+ of students complete their profile within the first week of receiving the class code.
- Zero data loss incidents (photos, rosters).
- New class setup (create + roster + share code + receive submissions) under 10 minutes of teacher time.

---

## Epic A — Platform & data foundation

| ID | Item | Notes |
|----|------|--------|
| A1 | Next.js app scaffold + env/config for VPS deploy | API routes co-located with UI |
| A2 | Postgres + numbered SQL migrations (`pg`, raw SQL) | Tables: `teachers`, `classes`, `students`, `seating_positions` per PRD |
| A3 | Indexes & constraints | e.g. `(class_id, lower(trim(legal_name)))`, `UNIQUE (class_id, student_id)` |
| A4 | Upload directory layout | `/var/app/uploads/classes/{class_id}/`, `students/{student_id}/` |
| A5 | Orphan-file cleanup job | Nightly scan; paths not in DB → delete |
| A6 | Manual filesystem audit script | Verify no orphans after class delete (Flow 5) |

---

## Epic B — Teacher authentication & dashboard

| ID | Item | Notes |
|----|------|--------|
| B1 | Auth.js — email + password signup/sign-in | |
| B2 | Empty dashboard + “Create your first class” CTA | Flow 1 |
| B3 | Session protection for all teacher routes | |

---

## Epic C — Class lifecycle & codes

| ID | Item | Notes |
|----|------|--------|
| C1 | Create / rename / delete class | Delete cascades DB + disk for class photos & students |
| C2 | Generate unique 6-char code (exclude 0/O, 1/I/l) | |
| C3 | Rotate class code; old code invalid immediately | |
| C4 | Copy class code + student form URL (teacher UX) | |
| C5 | Export class roster as JSON | |

---

## Epic D — Classroom & student photos (API + processing)

| ID | Item | Notes |
|----|------|--------|
| D1 | Authenticated file serving only | Never predictable public static URLs; UUID filenames |
| D2 | Student photo pipeline | JPEG/PNG/HEIC → sharp: resize, EXIF strip, JPEG ~85, max long edge 1024px |
| D3 | Classroom photo pipeline | Max 10 MB in; resize long edge 2048px |
| D4 | Client pre-check | Reject student uploads >5 MB before upload |
| D5 | Atomic submit | Failed upload/processing → no half-written student row |
| D6 | Delete paths remove DB row then disk | Class delete, student delete, self-delete |

---

## Epic E — Roster CSV

| ID | Item | Notes |
|----|------|--------|
| E1 | CSV template download + upload from class page | `csv-parse`, streaming |
| E2 | Validation | Required `legal_name`; optional `preferred_name`, `pronouns`; no dupes; empty cells; ≤1 MB, ≤200 rows |
| E3 | Import creates rows with `survey_submitted_at = NULL` | `source` / tracking per data model |
| E4 | Re-upload adds only new legal names | Existing rows unchanged |
| E5 | UI: “Awaiting submission” for pre-populated rows | |

---

## Epic F — Student survey & matching

| ID | Item | Notes |
|----|------|--------|
| F1 | Public URL + class code entry | Invalid code → clear error |
| F2 | Form fields | Photo, legal/preferred name, phonetic, pronouns, fun fact, consent checkbox |
| F3 | Block submit without consent | |
| F4 | Legal-name match (trim, case-insensitive) | Exact → update row + submitted; none → new + review; multiple → review + generic confirmation |
| F5 | Issue edit token; store hash; confirmation page with bookmarkable edit link | |
| F6 | Edit URL loads/update/delete own entry only | Re-entering code = new submission attempt per Flow 2 |
| F7 | Teacher review queue | No match / multiple matches |
| F8 | Rate limit submissions | e.g. 5/min per IP |

---

## Epic G — Teacher roster editing

| ID | Item | Notes |
|----|------|--------|
| G1 | Manually add student (bypass survey) | |
| G2 | Edit any student field | |
| G3 | Remove student | Row + seating + photo file |

---

## Epic H — Seating chart (dnd-kit)

| ID | Item | Notes |
|----|------|--------|
| H1 | Sidebar cards (photo + preferred name) + classroom canvas | |
| H2 | Drag sidebar ↔ canvas; drag on canvas | Mouse/touch sensors only in v1 |
| H3 | Positions as % (0–100); autosave on drop | |
| H4 | Persist/reload placement | |
| H5 | Click placed card → detail popover | Full fields |
| H6 | Remove from chart → back to sidebar (no delete) | Overlap OK in v1 |
| H7 | Alt text for photos | “Photo of [preferred name]” |

---

## Epic I — Accessibility & forms (v1 scope)

| ID | Item | Notes |
|----|------|--------|
| I1 | Keyboard-navigable, labeled forms | Seating chart drag is mouse/touch only in v1 |
| I2 | Color not sole indicator for status | |

---

## Epic J — Operations & backups

| ID | Item | Notes |
|----|------|--------|
| J1 | `pg_dump` + restic → Backblaze B2 | Daily schedule, retention per PRD |
| J2 | Monitoring | e.g. `/var/backups/last-success` stale alert |
| J3 | Quarterly restore drill + `runbooks/restore.md` | Document friction |

---

## Epic K — Privacy & compliance (implementation checklist)

| ID | Item | Notes |
|----|------|--------|
| K1 | No third-party analytics/telemetry on student data | |
| K2 | Document open items for school | FERPA/GDPR/retention — teacher-facing note optional |
| K3 | Teacher responsibility messaging | Consent outside app; in-app checkbox as secondary |

---

## Suggested v1 implementation order

Dependency-aware sequencing:

1. **A1–A4, B1–B3** — App, DB, teacher auth, shell dashboard  
2. **C1–C4, D1** — Classes, codes, authenticated file plumbing  
3. **D2–D4, F1–F4** — Photo pipeline + student form + matching  
4. **F5–F8, E1–E5, G1–G3** — Tokens, CSV, review queue, teacher edits  
5. **H1–H7** — Seating chart  
6. **C5, A5–A6, J1–J3** — Export, cleanup, backups  
7. **I1–I2, K1–K3** — Forms/a11y checklist and privacy gates  

---

## Later releases (from roadmap)

| Release | Scope |
|---------|--------|
| **v1.1** | Audio name pronunciation (record + playback on student card). Class archive action (strip photos/PPI; anonymized roster). |
| **v1.2** | Keyboard-accessible drag and drop; list-based seating fallback. |
| **v2** | Multi-tenancy: multiple teachers, data isolation, invites, quotas, stronger class-code model, multi-class enrollment. |

---

## Parking lot & spikes

| Item | Notes |
|------|--------|
| Preview as student (teacher) | PRD deferred — decide during implementation |
| Email on new submission | Useful for no-match queue; vs dashboard-only |
| **Spike:** Preview mode ROI | Before launch |
| **Spike:** Submission notifications | Auth.js email vs SMTP |

---

## Non-goals (v1 reminder)

- Grading, attendance, messaging  
- Native mobile apps (responsive web only)  
- Advanced analytics/reporting  
- Teacher-to-teacher sharing or class import/export  
- Real-time collaboration on one chart  

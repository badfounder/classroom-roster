import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getPool } from "@/lib/db";
import { isValidUuid } from "@/lib/validate-id";
import { PrintActions } from "./print-actions";
import "./print.css";

type StudentRow = {
  id: string;
  legal_name: string;
  preferred_name: string | null;
  phonetic_spelling: string | null;
  pronouns: string | null;
  hometown: string | null;
  major: string | null;
  favorite_food: string | null;
  weekend_activity: string | null;
  superpower: string | null;
  fun_fact: string | null;
  photo_path: string | null;
};

export default async function PrintClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { classId } = await params;
  if (!isValidUuid(classId)) {
    notFound();
  }
  const pool = getPool();

  const { rows: clsRows } = await pool.query<{
    id: string;
    name: string;
    classroom_photo_path: string | null;
  }>(
    `SELECT id, name, classroom_photo_path
     FROM classes WHERE id = $1 AND teacher_id = $2`,
    [classId, session.user.id]
  );
  const cls = clsRows[0];
  if (!cls) {
    notFound();
  }

  const { rows: students } = await pool.query<StudentRow>(
    `SELECT id, legal_name, preferred_name, phonetic_spelling, pronouns,
            hometown, major, favorite_food, weekend_activity, superpower,
            fun_fact, photo_path
     FROM students WHERE class_id = $1
     ORDER BY legal_name ASC`,
    [classId]
  );

  const { rows: positionRows } = await pool.query<{
    student_id: string;
    x: string;
    y: string;
  }>(
    `SELECT student_id, x::text, y::text
     FROM seating_positions WHERE class_id = $1`,
    [classId]
  );
  const positions = new Map<string, { x: number; y: number }>();
  for (const r of positionRows) {
    positions.set(r.student_id, { x: Number(r.x), y: Number(r.y) });
  }

  const { rows: slotRows } = await pool.query<{
    id: string;
    x: string;
    y: string;
    label: string | null;
    group_id: string | null;
  }>(
    `SELECT id, x::text, y::text, label, group_id FROM seat_slots
     WHERE class_id = $1 ORDER BY created_at ASC`,
    [classId]
  );
  const slots = slotRows.map((r) => ({
    id: r.id,
    x: Number(r.x),
    y: Number(r.y),
    label: r.label,
    groupId: r.group_id,
  }));

  const { rows: groupRows } = await pool.query<{
    id: string;
    group_index: number;
    name: string | null;
    description: string | null;
  }>(
    `SELECT id, group_index, name, description FROM seat_groups
     WHERE class_id = $1 ORDER BY group_index ASC`,
    [classId]
  );
  const groups = groupRows.map((r) => ({
    id: r.id,
    index: r.group_index,
    name: r.name,
    description: r.description,
  }));

  const classroomPhotoSrc = cls.classroom_photo_path
    ? `/api/uploads/${encodeURI(cls.classroom_photo_path)}`
    : null;

  // Group students by table when slots have group_ids and students are placed
  // near one of those slots. "Near" = same slot id wins; otherwise closest.
  const studentsByGroup = groupStudentsByTable(students, slots, groups, positions);

  return (
    <div className="print-root">
      <header className="print-header">
        <div>
          <p className="print-eyebrow">Classroom roster</p>
          <h1 className="print-title">{cls.name}</h1>
          <p className="print-meta">
            {students.length} student{students.length === 1 ? "" : "s"}
            {" · Printed "}
            {new Date().toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <PrintActions classId={classId} />
      </header>

      {classroomPhotoSrc || slots.length > 0 ? (
        <section className="print-chart-wrap">
          <h2 className="print-section-title">Seating chart</h2>
          <PrintChart
            classroomPhotoSrc={classroomPhotoSrc}
            slots={slots}
            groups={groups}
            positions={positions}
            students={students}
          />
        </section>
      ) : null}

      {studentsByGroup ? (
        <section className="print-roster-wrap">
          <h2 className="print-section-title">By table</h2>
          {studentsByGroup.map(({ group, members }) => (
            <div key={group.id} className="print-table-section">
              <h3 className="print-table-name">
                {group.name?.trim() || `Table ${group.index}`}
                {group.description ? (
                  <span className="print-table-desc"> — {group.description}</span>
                ) : null}
              </h3>
              {members.length === 0 ? (
                <p className="print-empty">No students placed at this table yet.</p>
              ) : (
                <div className="print-roster-grid">
                  {members.map((s) => (
                    <PrintStudentCard key={s.id} student={s} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      ) : null}

      <section className="print-roster-wrap">
        <h2 className="print-section-title">
          {studentsByGroup ? "Full roster" : "Roster"}
        </h2>
        {students.length === 0 ? (
          <p className="print-empty">No students in this class yet.</p>
        ) : (
          <div className="print-roster-grid">
            {students.map((s) => (
              <PrintStudentCard key={s.id} student={s} />
            ))}
          </div>
        )}
      </section>

      <footer className="print-footer no-print">
        <Link
          href={`/dashboard/classes/${classId}`}
          className="text-sm font-medium text-zinc-700 underline hover:text-zinc-900 dark:text-zinc-300"
        >
          ← Back to class
        </Link>
      </footer>
    </div>
  );
}

function PrintStudentCard({ student }: { student: StudentRow }) {
  const displayName = student.preferred_name?.trim() || student.legal_name;
  const photoSrc = student.photo_path
    ? `/api/uploads/${encodeURI(student.photo_path)}`
    : null;
  const facts: Array<{ label: string; value: string }> = [];
  if (student.pronouns) facts.push({ label: "Pronouns", value: student.pronouns });
  if (student.phonetic_spelling) facts.push({ label: "Phonetic", value: student.phonetic_spelling });
  if (student.major) facts.push({ label: "Major", value: student.major });
  if (student.hometown) facts.push({ label: "From", value: student.hometown });
  return (
    <div className="print-student-card">
      <div className="print-student-photo-wrap">
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoSrc} alt={`Photo of ${displayName}`} className="print-student-photo" />
        ) : (
          <span aria-hidden className="print-student-initial">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
      <div className="print-student-info">
        <p className="print-student-name">{displayName}</p>
        {student.preferred_name && student.preferred_name !== student.legal_name ? (
          <p className="print-student-legal">{student.legal_name}</p>
        ) : null}
        {facts.length > 0 ? (
          <dl className="print-student-facts">
            {facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {student.fun_fact ? (
          <p className="print-student-funfact">{student.fun_fact}</p>
        ) : null}
      </div>
    </div>
  );
}

function PrintChart({
  classroomPhotoSrc,
  slots,
  groups,
  positions,
  students,
}: {
  classroomPhotoSrc: string | null;
  slots: Array<{ id: string; x: number; y: number; label: string | null; groupId: string | null }>;
  groups: Array<{ id: string; index: number; name: string | null }>;
  positions: Map<string, { x: number; y: number }>;
  students: StudentRow[];
}) {
  const groupsById = new Map(groups.map((g) => [g.id, g]));
  const tableBoxes = computeTableBoxes(slots, groupsById);
  const studentById = new Map(students.map((s) => [s.id, s]));

  return (
    <div className="print-chart">
      {classroomPhotoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={classroomPhotoSrc} alt="" className="print-chart-photo" />
      ) : null}
      {tableBoxes.map((box) => (
        <div
          key={box.id}
          className="print-chart-table"
          style={{
            left: `${box.x}%`,
            top: `${box.y}%`,
            width: `${box.w}%`,
            height: `${box.h}%`,
          }}
        >
          <span className="print-chart-table-label">{box.label}</span>
        </div>
      ))}
      {slots.map((slot) => (
        <span
          key={slot.id}
          className="print-chart-seat"
          style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
        />
      ))}
      {[...positions.entries()].map(([studentId, pos]) => {
        const s = studentById.get(studentId);
        if (!s) return null;
        const name = s.preferred_name?.trim() || s.legal_name;
        return (
          <span
            key={studentId}
            className="print-chart-card"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            title={name}
          >
            {name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("")}
          </span>
        );
      })}
    </div>
  );
}

function computeTableBoxes(
  slots: Array<{ x: number; y: number; label: string | null; groupId: string | null }>,
  groupsById: Map<string, { id: string; index: number; name: string | null }>
): Array<{ id: string; x: number; y: number; w: number; h: number; label: string }> {
  const buckets = new Map<
    string,
    { slots: Array<{ x: number; y: number }>; label: string }
  >();
  for (const s of slots) {
    let key: string | null = null;
    let label = "Table";
    if (s.groupId) {
      key = s.groupId;
      const g = groupsById.get(s.groupId);
      label = g?.name?.trim() || (g?.index != null ? `T${g.index}` : "Table");
    } else {
      const m = s.label?.match(/^T(\d+)·/);
      if (m) {
        key = `idx:${m[1]}`;
        label = `T${m[1]}`;
      }
    }
    if (!key) continue;
    const existing = buckets.get(key);
    if (existing) existing.slots.push(s);
    else buckets.set(key, { slots: [s], label });
  }
  const out: Array<{ id: string; x: number; y: number; w: number; h: number; label: string }> = [];
  for (const [id, { slots: members, label }] of buckets) {
    if (members.length < 2) continue;
    const xs = members.map((m) => m.x);
    const ys = members.map((m) => m.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    out.push({
      id,
      label,
      x: minX + 1.2,
      y: minY + 1.2,
      w: Math.max(0, maxX - minX - 2.4),
      h: Math.max(0, maxY - minY - 2.4),
    });
  }
  return out;
}

function groupStudentsByTable(
  students: StudentRow[],
  slots: Array<{ id: string; x: number; y: number; groupId: string | null }>,
  groups: Array<{ id: string; index: number; name: string | null; description: string | null }>,
  positions: Map<string, { x: number; y: number }>
): Array<{
  group: { id: string; index: number; name: string | null; description: string | null };
  members: StudentRow[];
}> | null {
  if (groups.length === 0) return null;
  const slotsByGroup = new Map<string, Array<{ x: number; y: number }>>();
  for (const s of slots) {
    if (!s.groupId) continue;
    if (!slotsByGroup.has(s.groupId)) slotsByGroup.set(s.groupId, []);
    slotsByGroup.get(s.groupId)!.push({ x: s.x, y: s.y });
  }
  // Assign each placed student to the nearest table's centroid.
  const centroids = new Map<string, { x: number; y: number }>();
  for (const [gid, ss] of slotsByGroup) {
    const avgX = ss.reduce((a, b) => a + b.x, 0) / ss.length;
    const avgY = ss.reduce((a, b) => a + b.y, 0) / ss.length;
    centroids.set(gid, { x: avgX, y: avgY });
  }
  const groupMembers = new Map<string, StudentRow[]>();
  for (const g of groups) groupMembers.set(g.id, []);
  for (const student of students) {
    const pos = positions.get(student.id);
    if (!pos) continue;
    let best: { id: string; dist: number } | null = null;
    for (const [gid, c] of centroids) {
      const dx = c.x - pos.x;
      const dy = c.y - pos.y;
      const dist = dx * dx + dy * dy;
      if (!best || dist < best.dist) best = { id: gid, dist };
    }
    if (best) groupMembers.get(best.id)?.push(student);
  }
  return groups.map((g) => ({ group: g, members: groupMembers.get(g.id) ?? [] }));
}

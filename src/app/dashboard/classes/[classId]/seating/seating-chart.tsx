"use client";

import { useRef, useState, useTransition } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { placeStudent, removeFromChart } from "./seating-actions";

type Student = {
  id: string;
  legalName: string;
  preferredName: string | null;
  phoneticSpelling: string | null;
  pronouns: string | null;
  funFact: string | null;
  photoSrc: string | null;
};

type Position = { x: number; y: number };

type Props = {
  classId: string;
  classroomPhotoSrc: string | null;
  students: Student[];
  initialPositions: Record<string, Position>;
};

const SIDEBAR_DROPPABLE_ID = "seating-sidebar";
const CANVAS_DROPPABLE_ID = "seating-canvas";

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function displayName(s: Student): string {
  return s.preferredName && s.preferredName.length > 0 ? s.preferredName : s.legalName;
}

export function SeatingChart({
  classId,
  classroomPhotoSrc,
  students,
  initialPositions,
}: Props) {
  const [positions, setPositions] = useState<Record<string, Position>>(initialPositions);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const canvasRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const placedIds = new Set(Object.keys(positions));
  const placed = students.filter((s) => placedIds.has(s.id));
  const sidebar = students.filter((s) => !placedIds.has(s.id));
  const selected = selectedStudentId
    ? students.find((s) => s.id === selectedStudentId) ?? null
    : null;

  function persistPlace(studentId: string, x: number, y: number) {
    startTransition(async () => {
      const result = await placeStudent(classId, studentId, x, y);
      if (!result.ok) {
        setErrorMsg(result.error);
      }
    });
  }

  function persistRemove(studentId: string) {
    startTransition(async () => {
      const result = await removeFromChart(classId, studentId);
      if (!result.ok) {
        setErrorMsg(result.error);
      }
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over, delta, activatorEvent } = event;
    const studentId = String(active.id);

    if (over?.id === SIDEBAR_DROPPABLE_ID) {
      if (positions[studentId]) {
        const next = { ...positions };
        delete next[studentId];
        setPositions(next);
        persistRemove(studentId);
      }
      return;
    }

    if (over?.id === CANVAS_DROPPABLE_ID) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const existing = positions[studentId];
      let x: number;
      let y: number;
      if (existing) {
        x = existing.x + (delta.x / rect.width) * 100;
        y = existing.y + (delta.y / rect.height) * 100;
      } else {
        const ptr = activatorEvent as PointerEvent;
        const clientX = ptr.clientX + delta.x;
        const clientY = ptr.clientY + delta.y;
        x = ((clientX - rect.left) / rect.width) * 100;
        y = ((clientY - rect.top) / rect.height) * 100;
      }
      x = clamp(x, 0, 100);
      y = clamp(y, 0, 100);
      setPositions({ ...positions, [studentId]: { x, y } });
      persistPlace(studentId, x, y);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      {errorMsg ? (
        <p
          className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {errorMsg}
        </p>
      ) : null}

      <div className="flex flex-col gap-6 lg:flex-row">
        <Sidebar students={sidebar} />
        <Canvas
          canvasRef={canvasRef}
          photoSrc={classroomPhotoSrc}
          placed={placed}
          positions={positions}
          onSelect={setSelectedStudentId}
        />
      </div>

      {selected ? (
        <DetailPopover
          student={selected}
          onClose={() => setSelectedStudentId(null)}
          onRemove={() => {
            const next = { ...positions };
            delete next[selected.id];
            setPositions(next);
            persistRemove(selected.id);
            setSelectedStudentId(null);
          }}
        />
      ) : null}
    </DndContext>
  );
}

function Sidebar({ students }: { students: Student[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: SIDEBAR_DROPPABLE_ID });
  return (
    <div
      ref={setNodeRef}
      className={`flex w-full flex-shrink-0 flex-col gap-2 rounded-lg border p-3 lg:w-64 ${
        isOver
          ? "border-zinc-400 bg-zinc-100 dark:border-zinc-500 dark:bg-zinc-800"
          : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/40"
      }`}
    >
      <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Unplaced ({students.length})
      </h3>
      {students.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          All students are on the chart. Drop a card here to remove it.
        </p>
      ) : (
        students.map((s) => <DraggableCard key={s.id} student={s} variant="sidebar" />)
      )}
    </div>
  );
}

function Canvas({
  canvasRef,
  photoSrc,
  placed,
  positions,
  onSelect,
}: {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  photoSrc: string | null;
  placed: Student[];
  positions: Record<string, Position>;
  onSelect: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: CANVAS_DROPPABLE_ID });
  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        canvasRef.current = node;
      }}
      className={`relative aspect-video min-h-[20rem] w-full flex-1 overflow-hidden rounded-lg border bg-zinc-100 dark:bg-zinc-900 ${
        isOver
          ? "border-zinc-500 dark:border-zinc-400"
          : "border-zinc-200 dark:border-zinc-700"
      }`}
    >
      {photoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- authenticated API route
        <img
          src={photoSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
          No classroom photo. Cards still drop here, but a photo helps anchor positions.
        </div>
      )}
      {placed.map((s) => {
        const pos = positions[s.id]!;
        return (
          <DraggableCard
            key={s.id}
            student={s}
            variant="canvas"
            position={pos}
            onSelect={onSelect}
          />
        );
      })}
    </div>
  );
}

function DraggableCard({
  student,
  variant,
  position,
  onSelect,
}: {
  student: Student;
  variant: "sidebar" | "canvas";
  position?: Position;
  onSelect?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: student.id,
  });

  const baseClasses =
    "flex items-center gap-2 rounded-md border bg-white p-1.5 text-xs shadow-sm dark:bg-zinc-800 select-none";

  if (variant === "sidebar") {
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        style={{ transform: CSS.Translate.toString(transform), touchAction: "none" }}
        className={`${baseClasses} cursor-grab border-zinc-200 dark:border-zinc-700 ${
          isDragging ? "opacity-60" : ""
        }`}
      >
        <CardInner student={student} />
      </div>
    );
  }

  const pos = position ?? { x: 50, y: 50 };
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) onSelect?.(student.id);
      }}
      style={{
        transform: CSS.Translate.toString(transform),
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        touchAction: "none",
      }}
      className={`${baseClasses} absolute cursor-grab border-zinc-300 ring-1 ring-black/5 dark:border-zinc-600 ${
        isDragging ? "opacity-80 z-10" : ""
      }`}
    >
      <CardInner student={student} />
    </div>
  );
}

function CardInner({ student }: { student: Student }) {
  const name = displayName(student);
  return (
    <>
      {student.photoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- authenticated API route
        <img
          src={student.photoSrc}
          alt={`Photo of ${name}`}
          className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
          draggable={false}
        />
      ) : (
        <span
          aria-hidden
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
        >
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="font-medium text-zinc-900 dark:text-zinc-100">{name}</span>
    </>
  );
}

function DetailPopover({
  student,
  onClose,
  onRemove,
}: {
  student: Student;
  onClose: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          {student.photoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- authenticated API route
            <img
              src={student.photoSrc}
              alt={`Photo of ${displayName(student)}`}
              className="h-16 w-16 flex-shrink-0 rounded-full object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {displayName(student)}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Legal: {student.legalName}
            </p>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
          {student.phoneticSpelling ? (
            <Field label="Phonetic">{student.phoneticSpelling}</Field>
          ) : null}
          {student.pronouns ? <Field label="Pronouns">{student.pronouns}</Field> : null}
          {student.funFact ? <Field label="Fun fact">{student.funFact}</Field> : null}
        </dl>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 text-sm">
          <button
            type="button"
            onClick={onRemove}
            className="font-medium text-red-700 underline dark:text-red-400"
          >
            Remove from chart
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-zinc-900 dark:text-zinc-100">{children}</dd>
    </div>
  );
}

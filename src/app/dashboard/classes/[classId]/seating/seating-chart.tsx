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
import {
  addSeatSlot,
  autoArrangeSeating,
  clearAllSeating,
  clearSeatSlots,
  deleteSeatSlot,
  detectSeatsForClass,
  generateSeatGrid,
  placeStudent,
  removeFromChart,
} from "./seating-actions";
import { Alert, Button } from "@/components/ui";
import { computeGridPositions } from "@/lib/seating-grid";

type Student = {
  id: string;
  legalName: string;
  preferredName: string | null;
  phoneticSpelling: string | null;
  pronouns: string | null;
  funFact: string | null;
  hometown: string | null;
  major: string | null;
  favoriteFood: string | null;
  weekendActivity: string | null;
  superpower: string | null;
  photoSrc: string | null;
  audioSrc: string | null;
};

type Position = { x: number; y: number };

export type SeatSlot = {
  id: string;
  x: number;
  y: number;
  label: string | null;
};

type Props = {
  classId: string;
  classroomPhotoSrc: string | null;
  students: Student[];
  initialPositions: Record<string, Position>;
  initialSlots: SeatSlot[];
  aiDetectionAvailable: boolean;
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
  initialSlots,
  aiDetectionAvailable,
}: Props) {
  const [positions, setPositions] = useState<Record<string, Position>>(initialPositions);
  const [slots, setSlots] = useState<SeatSlot[]>(initialSlots);
  const [mode, setMode] = useState<"arrange" | "edit-seats">(
    initialSlots.length === 0 && classroomPhotoSrc ? "edit-seats" : "arrange"
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
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

  function runAutoArrange() {
    // Optimistically lay out every unplaced student in a grid that matches
    // the server-side algorithm; the action then persists the same values.
    const unplaced = students
      .filter((s) => !positions[s.id])
      .sort((a, b) => a.legalName.localeCompare(b.legalName));
    if (unplaced.length === 0) return;
    const grid = computeGridPositions(unplaced.length);
    const next = { ...positions };
    unplaced.forEach((s, i) => {
      next[s.id] = grid[i]!;
    });
    setPositions(next);
    setErrorMsg(null);
    startTransition(async () => {
      const result = await autoArrangeSeating(classId);
      if (!result.ok) {
        setErrorMsg(result.error);
      }
    });
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (mode !== "edit-seats") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Only fire when the click landed on the canvas itself, not on a child
    // (e.g. clicking a slot marker should delete it via its own handler).
    if (e.target !== canvas && !(e.target as HTMLElement).dataset.canvasClick) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100);
    const tempId = `tmp-${Date.now()}`;
    const optimistic: SeatSlot = { id: tempId, x, y, label: null };
    setSlots((prev) => [...prev, optimistic]);
    setErrorMsg(null);
    startTransition(async () => {
      const result = await addSeatSlot(classId, x, y);
      if (!result.ok) {
        setErrorMsg(result.error);
        setSlots((prev) => prev.filter((s) => s.id !== tempId));
      } else {
        setSlots((prev) =>
          prev.map((s) => (s.id === tempId ? { ...s, id: result.id } : s))
        );
      }
    });
  }

  function removeSlot(slotId: string) {
    const snapshot = slots;
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
    startTransition(async () => {
      const result = await deleteSeatSlot(classId, slotId);
      if (!result.ok) {
        setErrorMsg(result.error);
        setSlots(snapshot);
      }
    });
  }

  function runClearSlots() {
    if (slots.length === 0) return;
    if (!window.confirm(`Remove all ${slots.length} seat slot(s)?`)) return;
    const snapshot = slots;
    setSlots([]);
    startTransition(async () => {
      const result = await clearSeatSlots(classId);
      if (!result.ok) {
        setErrorMsg(result.error);
        setSlots(snapshot);
      }
    });
  }

  function runGenerateGrid(rows: number, cols: number) {
    if (
      slots.length > 0 &&
      !window.confirm(
        `Replace the ${slots.length} existing seat slot(s) with a ${rows} × ${cols} grid?`
      )
    ) {
      return;
    }
    setErrorMsg(null);
    setInfoMsg(null);
    startTransition(async () => {
      const result = await generateSeatGrid(classId, rows, cols);
      if (!result.ok) {
        setErrorMsg(result.error);
        return;
      }
      setSlots(result.slots);
      setMode("edit-seats");
      setInfoMsg(`Laid out ${result.slots.length} seats in a ${rows} × ${cols} grid.`);
    });
  }

  function runDetect() {
    if (detecting) return;
    if (
      slots.length > 0 &&
      !window.confirm(
        `Replace the ${slots.length} existing seat slot(s) with Claude's detection?`
      )
    ) {
      return;
    }
    setErrorMsg(null);
    setInfoMsg(null);
    setDetecting(true);
    startTransition(async () => {
      const result = await detectSeatsForClass(classId);
      setDetecting(false);
      if (!result.ok) {
        setErrorMsg(result.error);
        return;
      }
      setSlots(result.slots);
      setMode("edit-seats");
      setInfoMsg(
        `Claude found ${result.slots.length} seat${result.slots.length === 1 ? "" : "s"}. Drag any to fine-tune.`
      );
    });
  }

  function runClearAll() {
    if (
      Object.keys(positions).length > 0 &&
      !window.confirm("Clear every seating position for this class?")
    ) {
      return;
    }
    setPositions({});
    setErrorMsg(null);
    startTransition(async () => {
      const result = await clearAllSeating(classId);
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

  const unplacedCount = sidebar.length;
  const placedCount = placed.length;

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      {errorMsg ? (
        <div className="mb-4">
          <Alert variant="error">{errorMsg}</Alert>
        </div>
      ) : null}
      {infoMsg ? (
        <div className="mb-4">
          <Alert variant="success">{infoMsg}</Alert>
        </div>
      ) : null}

      {/* Mode tabs */}
      <div className="mb-3 inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900/60">
        <button
          type="button"
          onClick={() => setMode("arrange")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            mode === "arrange"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Arrange students
        </button>
        <button
          type="button"
          onClick={() => setMode("edit-seats")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            mode === "edit-seats"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Edit seats ({slots.length})
        </button>
      </div>

      {mode === "arrange" ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{placedCount}</span> placed
            {" · "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{unplacedCount}</span> unplaced
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {unplacedCount > 0 ? (
              <Button type="button" variant="secondary" size="sm" onClick={runAutoArrange}>
                ✨ Auto-arrange ({unplacedCount})
              </Button>
            ) : null}
            {placedCount > 0 ? (
              <Button type="button" variant="ghost" size="sm" onClick={runClearAll}>
                Clear all
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mb-4 space-y-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Click anywhere on the canvas to drop a seat, or generate a grid below.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <RowColForm onGenerate={runGenerateGrid} />
            {classroomPhotoSrc && aiDetectionAvailable ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={runDetect}
                disabled={detecting}
                title="Sends the classroom photo (no student data) to Anthropic's API"
              >
                {detecting ? "Detecting…" : "✨ Detect from photo (AI)"}
              </Button>
            ) : null}
            {slots.length > 0 ? (
              <Button type="button" variant="ghost" size="sm" onClick={runClearSlots}>
                Clear seats
              </Button>
            ) : null}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        <Sidebar students={sidebar} onAutoArrange={runAutoArrange} />
        <Canvas
          canvasRef={canvasRef}
          photoSrc={classroomPhotoSrc}
          placed={placed}
          positions={positions}
          onSelect={setSelectedStudentId}
          onAutoArrange={runAutoArrange}
          showAutoArrangeHint={unplacedCount > 0 && placedCount === 0 && mode === "arrange"}
          slots={slots}
          mode={mode}
          onCanvasClick={handleCanvasClick}
          onRemoveSlot={removeSlot}
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

function Sidebar({
  students,
  onAutoArrange,
}: {
  students: Student[];
  onAutoArrange: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: SIDEBAR_DROPPABLE_ID });
  return (
    <aside
      ref={setNodeRef}
      className={`flex w-full flex-shrink-0 flex-col gap-3 rounded-2xl border p-4 lg:w-72 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto ${
        isOver
          ? "border-zinc-400 bg-zinc-100 dark:border-zinc-500 dark:bg-zinc-800"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Unplaced ({students.length})
        </h3>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Drag onto the canvas, or drop a placed card here to remove it.
        </p>
      </div>
      {students.length === 0 ? (
        <p className="rounded-lg bg-zinc-50 px-3 py-4 text-center text-sm text-zinc-500 dark:bg-zinc-900/40 dark:text-zinc-400">
          Everyone is placed. ✨
        </p>
      ) : (
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onAutoArrange}>
            ✨ Auto-arrange all
          </Button>
          <ul className="flex flex-col gap-2">
            {students.map((s) => (
              <li key={s.id}>
                <DraggableCard student={s} variant="sidebar" />
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}

function Canvas({
  canvasRef,
  photoSrc,
  placed,
  positions,
  onSelect,
  onAutoArrange,
  showAutoArrangeHint,
  slots,
  mode,
  onCanvasClick,
  onRemoveSlot,
}: {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  photoSrc: string | null;
  placed: Student[];
  positions: Record<string, Position>;
  onSelect: (id: string) => void;
  onAutoArrange: () => void;
  showAutoArrangeHint: boolean;
  slots: SeatSlot[];
  mode: "arrange" | "edit-seats";
  onCanvasClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onRemoveSlot: (slotId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: CANVAS_DROPPABLE_ID });
  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        canvasRef.current = node;
      }}
      onClick={onCanvasClick}
      data-canvas-click="true"
      className={`relative aspect-video min-h-[28rem] w-full flex-1 overflow-hidden rounded-2xl border-2 bg-zinc-100 shadow-sm dark:bg-zinc-950 ${
        mode === "edit-seats" ? "cursor-crosshair" : ""
      } ${
        isOver
          ? "border-zinc-500 dark:border-zinc-400"
          : "border-zinc-200 dark:border-zinc-800"
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
      ) : showAutoArrangeHint ? (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
            No classroom photo uploaded. Upload one on the class page to anchor your layout, or
            start with an auto-arranged grid:
          </p>
          <Button type="button" variant="primary" onClick={onAutoArrange}>
            ✨ Auto-arrange in a grid
          </Button>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No classroom photo. Drag cards anywhere, or upload a photo on the class page.
        </div>
      )}
      {slots.map((slot) => (
        <SeatSlotMarker
          key={slot.id}
          slot={slot}
          interactive={mode === "edit-seats"}
          onRemove={() => onRemoveSlot(slot.id)}
        />
      ))}
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

function RowColForm({
  onGenerate,
}: {
  onGenerate: (rows: number, cols: number) => void;
}) {
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(6);

  const inputClass =
    "w-16 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-center text-sm tabular text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-4 focus:ring-zinc-900/5 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onGenerate(rows, cols);
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Rows
        <input
          type="number"
          min={1}
          max={20}
          value={rows}
          onChange={(e) => setRows(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
          className={inputClass}
        />
      </label>
      <span className="pb-2 text-zinc-400">×</span>
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Columns
        <input
          type="number"
          min={1}
          max={20}
          value={cols}
          onChange={(e) => setCols(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
          className={inputClass}
        />
      </label>
      <Button type="submit" size="sm">
        Generate {rows * cols} seats
      </Button>
    </form>
  );
}

function SeatSlotMarker({
  slot,
  interactive,
  onRemove,
}: {
  slot: SeatSlot;
  interactive: boolean;
  onRemove: () => void;
}) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (interactive) onRemove();
      }}
      style={{
        left: `${slot.x}%`,
        top: `${slot.y}%`,
        transform: "translate(-50%, -50%)",
      }}
      title={
        interactive
          ? slot.label
            ? `${slot.label} — click to remove`
            : "Click to remove"
          : slot.label ?? "Seat"
      }
      className={`absolute z-0 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 ${
        interactive
          ? "cursor-pointer border-rose-500 bg-rose-100 text-rose-700 shadow-sm hover:scale-110 hover:bg-rose-200 dark:border-rose-400 dark:bg-rose-950/60 dark:text-rose-200"
          : "border-zinc-400/60 bg-white/70 backdrop-blur-sm dark:border-zinc-500/60 dark:bg-zinc-800/60"
      }`}
    >
      <span className="text-[10px] font-semibold leading-none" aria-hidden>
        {interactive ? "×" : ""}
      </span>
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
    "flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2 shadow-sm dark:bg-zinc-800 select-none";

  if (variant === "sidebar") {
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        style={{ transform: CSS.Translate.toString(transform), touchAction: "none" }}
        className={`${baseClasses} cursor-grab border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-700/60 ${
          isDragging ? "opacity-50 ring-2 ring-zinc-300" : ""
        }`}
      >
        <CardInner student={student} />
      </div>
    );
  }

  const pos = position ?? { x: 50, y: 50 };
  // Compose the drag delta with a fixed -50%/-50% translate so the stored
  // (x, y) percent is the card's *center* — that keeps the rightmost grid
  // column on the canvas regardless of card width.
  const dragTransform = CSS.Translate.toString(transform);
  const composedTransform = dragTransform
    ? `${dragTransform} translate(-50%, -50%)`
    : "translate(-50%, -50%)";
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
        transform: composedTransform,
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        touchAction: "none",
      }}
      className={`${baseClasses} absolute max-w-[10rem] cursor-grab border-zinc-300 ring-2 ring-white/70 dark:border-zinc-600 dark:ring-zinc-950/60 ${
        isDragging ? "opacity-80 z-10 shadow-lg" : "hover:shadow-md"
      }`}
    >
      <CardInner student={student} truncate />
    </div>
  );
}

function CardInner({ student, truncate }: { student: Student; truncate?: boolean }) {
  const name = displayName(student);
  return (
    <>
      {student.photoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- authenticated API route
        <img
          src={student.photoSrc}
          alt={`Photo of ${name}`}
          className="h-10 w-10 flex-shrink-0 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
          draggable={false}
        />
      ) : (
        <span
          aria-hidden
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
        >
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span
        className={`text-sm font-medium text-zinc-900 dark:text-zinc-100 ${
          truncate ? "min-w-0 truncate" : ""
        }`}
      >
        {name}
      </span>
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          {student.photoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- authenticated API route
            <img
              src={student.photoSrc}
              alt={`Photo of ${displayName(student)}`}
              className="h-20 w-20 flex-shrink-0 rounded-2xl object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
            />
          ) : (
            <span
              aria-hidden
              className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-zinc-200 text-2xl font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
            >
              {displayName(student).slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {displayName(student)}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Legal: {student.legalName}
            </p>
          </div>
        </div>

        {student.audioSrc ? (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Pronunciation
            </p>
            <audio controls src={student.audioSrc} className="mt-1 h-9 w-full" />
          </div>
        ) : null}

        <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
          {student.phoneticSpelling ? (
            <PopoverField label="Phonetic">{student.phoneticSpelling}</PopoverField>
          ) : null}
          {student.pronouns ? <PopoverField label="Pronouns">{student.pronouns}</PopoverField> : null}
          {student.hometown ? <PopoverField label="From">{student.hometown}</PopoverField> : null}
          {student.major ? <PopoverField label="Major">{student.major}</PopoverField> : null}
          {student.favoriteFood ? (
            <PopoverField label="Favorite food">{student.favoriteFood}</PopoverField>
          ) : null}
          {student.weekendActivity ? (
            <PopoverField label="Weekend mode">{student.weekendActivity}</PopoverField>
          ) : null}
          {student.superpower ? (
            <PopoverField label="Superpower" wide>
              {student.superpower}
            </PopoverField>
          ) : null}
          {student.funFact ? (
            <PopoverField label="Anything else" wide>
              {student.funFact}
            </PopoverField>
          ) : null}
        </dl>

        <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onRemove}
            className="text-sm font-medium text-red-700 hover:underline dark:text-red-400"
          >
            Remove from chart
          </button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

function PopoverField({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{children}</dd>
    </div>
  );
}

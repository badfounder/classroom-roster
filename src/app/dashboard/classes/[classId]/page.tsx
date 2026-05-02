import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { rotateClassCode } from "../actions";
import { getPool } from "@/lib/db";
import { getRequestOrigin } from "@/lib/request-origin";
import { ClassRosterPanel } from "./class-roster-panel";
import { CopyLinks } from "./copy-links";
import { DeleteClassForm } from "./delete-class-form";
import { RenameClassForm } from "./rename-class-form";
import { ReplacePhotoForm } from "./replace-photo-form";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { classId } = await params;
  const pool = getPool();
  const { rows } = await pool.query<{
    id: string;
    name: string;
    class_code: string;
    classroom_photo_path: string | null;
  }>(
    `SELECT id, name, class_code, classroom_photo_path
     FROM classes WHERE id = $1 AND teacher_id = $2`,
    [classId, session.user.id]
  );
  const cls = rows[0];
  if (!cls) {
    notFound();
  }

  const origin = await getRequestOrigin();
  const joinUrl = `${origin}/join`;
  const surveyUrl = `${origin}/join/${cls.class_code}/survey`;
  const photoSrc = cls.classroom_photo_path
    ? `/api/uploads/${encodeURI(cls.classroom_photo_path)}`
    : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/dashboard" className="font-medium text-zinc-900 underline dark:text-zinc-100">
          ← Dashboard
        </Link>
      </p>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {cls.name}
          </h1>
          <div className="mt-6">
            <RenameClassForm classId={cls.id} initialName={cls.name} />
          </div>
        </div>
        <DeleteClassForm classId={cls.id} className={cls.name} />
      </div>

      <div className="mt-10">
        <CopyLinks joinUrl={joinUrl} surveyUrl={surveyUrl} classCode={cls.class_code} />
      </div>

      <section className="mt-10 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Class code</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Rotating generates a new code. The previous code stops working immediately.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-lg tracking-wider dark:bg-zinc-900">
            {cls.class_code}
          </code>
          <form action={rotateClassCode.bind(null, cls.id)}>
            <button
              type="submit"
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-950 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950"
            >
              Rotate code
            </button>
          </form>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Classroom photo</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Used later for the seating chart background. JPEG or PNG, stored only on your server.
        </p>
        {photoSrc ? (
          <div className="mt-4 max-w-xl overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900">
            {/* eslint-disable-next-line @next/next/no-img-element -- authenticated API route */}
            <img
              src={photoSrc}
              alt={`Classroom for ${cls.name}`}
              className="max-h-96 w-full object-contain"
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">No photo yet.</p>
        )}
        <div className="mt-4">
          <ReplacePhotoForm classId={cls.id} />
        </div>
      </section>

      <section className="mt-12 border-t border-zinc-200 pt-10 dark:border-zinc-700">
        <ClassRosterPanel classId={cls.id} />
      </section>

      <section className="mt-12 border-t border-zinc-200 pt-10 dark:border-zinc-700">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Seating chart</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Drag student cards onto the classroom photo. Positions autosave.
        </p>
        <Link
          href={`/dashboard/classes/${cls.id}/seating`}
          className="mt-3 inline-block rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          Open seating chart
        </Link>
      </section>
    </div>
  );
}

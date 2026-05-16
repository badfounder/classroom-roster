import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { rotateClassCode } from "../actions";
import { getPool } from "@/lib/db";
import { isValidUuid } from "@/lib/validate-id";
import { getRequestOrigin } from "@/lib/request-origin";
import { ClassRosterPanel } from "./class-roster-panel";
import { CopyLinks } from "./copy-links";
import { DeleteClassForm } from "./delete-class-form";
import { RenameClassForm } from "./rename-class-form";
import { ReplacePhotoForm } from "./replace-photo-form";
import { Button, Card, NavBack, PageHeader, SectionHeader } from "@/components/ui";

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
  if (!isValidUuid(classId)) {
    notFound();
  }
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
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <NavBack href="/dashboard" label="Dashboard" />

      <div className="mt-6">
        <PageHeader
          eyebrow="Class"
          title={cls.name}
          actions={
            <Link href={`/dashboard/classes/${cls.id}/seating`}>
              <Button>Open seating chart</Button>
            </Link>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: share, code, settings */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <SectionHeader title="Share with students" />
            <CopyLinks joinUrl={joinUrl} surveyUrl={surveyUrl} classCode={cls.class_code} />
          </Card>

          <Card>
            <SectionHeader
              title="Class code"
              description="Rotating generates a new code. The previous code stops working immediately."
            />
            <div className="flex flex-wrap items-center gap-3">
              <code className="rounded-md bg-zinc-100 px-3 py-2 font-mono text-xl tabular tracking-wider text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                {cls.class_code}
              </code>
              <form action={rotateClassCode.bind(null, cls.id)}>
                <Button variant="secondary" type="submit">
                  Rotate code
                </Button>
              </form>
            </div>
          </Card>

          <Card>
            <SectionHeader title="Settings" />
            <RenameClassForm classId={cls.id} initialName={cls.name} />
            <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
              <DeleteClassForm classId={cls.id} className={cls.name} />
            </div>
          </Card>
        </div>

        {/* Right column: photo + roster */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <SectionHeader
              title="Classroom photo"
              description="Used as the seating chart background. JPEG or PNG, stored only on your server."
            />
            {photoSrc ? (
              <div className="mb-4 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950">
                {/* eslint-disable-next-line @next/next/no-img-element -- authenticated API route */}
                <img
                  src={photoSrc}
                  alt={`Classroom for ${cls.name}`}
                  className="max-h-96 w-full object-contain"
                />
              </div>
            ) : (
              <div className="mb-4 flex h-48 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40">
                No photo yet — upload one below to enable the seating chart.
              </div>
            )}
            <ReplacePhotoForm classId={cls.id} />
          </Card>

          <Card>
            <ClassRosterPanel classId={cls.id} />
          </Card>
        </div>
      </div>
    </div>
  );
}

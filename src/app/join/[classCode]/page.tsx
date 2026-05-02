import Link from "next/link";
import { notFound } from "next/navigation";
import { normalizeClassCode } from "@/lib/class-code";
import { getPool } from "@/lib/db";

export default async function JoinClassLandingPage({
  params,
}: {
  params: Promise<{ classCode: string }>;
}) {
  const { classCode: raw } = await params;
  const code = normalizeClassCode(decodeURIComponent(raw));
  if (code.length !== 6) {
    notFound();
  }

  const pool = getPool();
  const { rows } = await pool.query<{ name: string }>(
    `SELECT name FROM classes WHERE class_code = $1`,
    [code]
  );
  const row = rows[0];
  if (!row) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Class <span className="font-medium text-zinc-900 dark:text-zinc-100">{row.name}</span>
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Welcome
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Your teacher uses this to learn names and faces. All information stays on your school&apos;s
        server.
      </p>
      <p className="mt-8">
        <Link
          href={`/join/${code}/survey`}
          className="inline-flex rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Continue to student form
        </Link>
      </p>
      <p className="mt-6 text-sm">
        <Link href="/join" className="font-medium text-zinc-900 underline dark:text-zinc-100">
          ← Enter a different code
        </Link>
      </p>
    </div>
  );
}

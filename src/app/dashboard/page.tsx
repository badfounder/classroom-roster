import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { getPool } from "@/lib/db";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const teacherId = session.user.id;
  const pool = getPool();
  const { rows: classes } = await pool.query<{
    id: string;
    name: string;
    class_code: string;
    created_at: Date;
  }>(
    `SELECT id, name, class_code, created_at
     FROM classes
     WHERE teacher_id = $1
     ORDER BY name ASC`,
    [teacherId]
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Signed in as{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {session.user.email}
            </span>
            {session.user.name ? (
              <>
                {" "}
                ({session.user.name})
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/classes/new"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            New class
          </Link>
          <SignOutButton />
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="mt-16 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center dark:border-zinc-600 dark:bg-zinc-900/40">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Create your first class</p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            You will get a class code to share and optional classroom photo for the seating chart.
          </p>
          <Link
            href="/dashboard/classes/new"
            className="mt-6 inline-flex rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Create class
          </Link>
        </div>
      ) : (
        <ul className="mt-10 divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-700 dark:border-zinc-700">
          {classes.map((c) => (
            <li key={c.id}>
              <Link
                href={`/dashboard/classes/${c.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{c.name}</span>
                <span className="font-mono text-sm tracking-wider text-zinc-500 dark:text-zinc-400">
                  {c.class_code}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-sm text-zinc-600 dark:text-zinc-400">
        Student entry point:{" "}
        <Link href="/join" className="font-medium text-zinc-900 underline dark:text-zinc-100">
          /join
        </Link>
      </p>
      <p className="mt-6">
        <Link href="/" className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100">
          ← Home
        </Link>
      </p>
    </div>
  );
}

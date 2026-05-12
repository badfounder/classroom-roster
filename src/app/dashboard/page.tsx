import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { getPool } from "@/lib/db";
import { SignOutButton } from "./sign-out-button";
import { Button, PageHeader } from "@/components/ui";

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
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <PageHeader
        eyebrow={`Signed in as ${session.user.email}${
          session.user.name ? ` (${session.user.name})` : ""
        }`}
        title="Your classes"
        description="Each class has a code students enter to submit their profile. Open a class to manage its roster and seating chart."
        actions={
          <>
            <Link href="/dashboard/classes/new">
              <Button>+ New class</Button>
            </Link>
            <SignOutButton />
          </>
        }
      />

      {classes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-8 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Create your first class
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            You&rsquo;ll get a class code to share and can optionally upload a photo of the
            classroom to anchor the seating chart.
          </p>
          <Link href="/dashboard/classes/new" className="mt-8 inline-block">
            <Button size="lg">Create class</Button>
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <li key={c.id}>
              <Link
                href={`/dashboard/classes/${c.id}`}
                className="group flex h-full flex-col justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
              >
                <span className="text-lg font-semibold tracking-tight text-zinc-900 group-hover:text-zinc-700 dark:text-zinc-50 dark:group-hover:text-zinc-200">
                  {c.name}
                </span>
                <span className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
                  <span>Class code</span>
                  <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-sm tabular tracking-wider text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    {c.class_code}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-16 border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        Student entry point:{" "}
        <Link href="/join" className="font-medium text-zinc-900 underline dark:text-zinc-100">
          /join
        </Link>
      </div>
    </div>
  );
}

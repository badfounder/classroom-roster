import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="max-w-lg text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Classroom Roster &amp; Seating Chart
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Self-hosted app for learning student names and building a seating chart from your classroom
          photo. Configure{" "}
          <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
            .env.local
          </code>{" "}
          from{" "}
          <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
            .env.example
          </code>
          , run{" "}
          <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
            npm run db:migrate
          </code>
          , sign up, then create classes and share the{" "}
          <Link href="/join" className="font-medium text-zinc-900 underline dark:text-zinc-100">
            /join
          </Link>{" "}
          link with students.
        </p>
        <nav className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-zinc-700 underline dark:text-zinc-300"
          >
            Dashboard
          </Link>
        </nav>
      </main>
    </div>
  );
}

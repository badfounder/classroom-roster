import Link from "next/link";
import { Button } from "@/components/ui";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Classroom Roster
          </span>
          <nav className="flex items-center gap-2">
            <Link
              href="/join"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              I&rsquo;m a student
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="sm">Sign in</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              For teachers, self-hosted
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
              Learn your students&rsquo; names, faces, and seats — without giving their data away.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
              A simple roster and visual seating chart that runs on your own server. Students fill
              a quick profile via a class code; you drag their cards onto a photo of your real
              classroom. No third-party analytics, no telemetry, no data leaving your VPS.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/signup">
                <Button size="lg">Create teacher account</Button>
              </Link>
              <Link href="/join">
                <Button variant="secondary" size="lg">Student? Enter a class code</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-zinc-200 bg-surface-muted dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mx-auto grid max-w-5xl gap-8 px-6 py-16 sm:grid-cols-3 sm:py-20">
            <Feature
              title="Names & pronunciations"
              body="Students submit preferred name, phonetic spelling, pronouns, and a photo. You see them grouped by class."
            />
            <Feature
              title="Seating chart on your photo"
              body="Upload a photo of your real classroom. Drag student cards onto where they actually sit. Positions autosave."
            />
            <Feature
              title="Your server, your data"
              body="Photos and rosters live on your VPS. Deleting a class wipes its files. Built-in backup script ships to your own restic repo."
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        Self-hosted &middot; No telemetry &middot; <Link href="/dashboard" className="underline hover:text-zinc-900 dark:hover:text-zinc-100">Dashboard</Link>
      </footer>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{body}</p>
    </div>
  );
}

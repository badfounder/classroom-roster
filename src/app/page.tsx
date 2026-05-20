import Link from "next/link";
import { Button } from "@/components/ui";
import { ClassroomHero } from "@/components/illustrations";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            <span
              aria-hidden
              className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-white"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                <circle cx="4" cy="4" r="2" fill="currentColor" />
                <circle cx="12" cy="4" r="2" fill="currentColor" />
                <circle cx="4" cy="12" r="2" fill="currentColor" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </svg>
            </span>
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
        {/* Soft brand-tinted gradient behind the hero — makes the page feel
            warmer without taking over. */}
        <div className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/70 via-transparent to-transparent dark:from-brand-100/10"
          />
          <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 sm:py-24 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700 dark:border-brand-200/30 dark:bg-brand-100/10 dark:text-brand-300">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-600 dark:bg-brand-400" />
                For teachers · Self-hosted
              </p>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
                Learn your students&rsquo;{" "}
                <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent dark:from-brand-400 dark:to-brand-200">
                  names, faces, and seats
                </span>{" "}
                — without giving their data away.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
                A simple roster and visual seating chart that runs on your own server. Students
                fill a quick profile via a class code; you drag their cards onto a photo of your
                real classroom. No third-party analytics, no telemetry, no data leaving your VPS.
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
            <div className="lg:col-span-2">
              <ClassroomHero className="mx-auto w-full max-w-md drop-shadow-sm" />
            </div>
          </section>
        </div>

        <section className="border-t border-zinc-200 bg-surface-muted dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mx-auto grid max-w-5xl gap-8 px-6 py-16 sm:grid-cols-3 sm:py-20">
            <Feature
              icon="🗣"
              title="Names & pronunciations"
              body="Students submit preferred name, phonetic spelling, pronouns, a photo, and an optional voice clip saying their own name."
            />
            <Feature
              icon="🪑"
              title="Seating chart on your photo"
              body="Upload a photo of your real classroom. Use Lecture or Tables mode to drop seats, then drag students onto where they actually sit."
            />
            <Feature
              icon="🔒"
              title="Your server, your data"
              body="Photos and rosters live on your VPS. Deleting a class wipes its files. Built-in backup script ships to your own restic repo."
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        Self-hosted &middot; No telemetry &middot;{" "}
        <Link href="/dashboard" className="underline hover:text-zinc-900 dark:hover:text-zinc-100">
          Dashboard
        </Link>
      </footer>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex flex-col gap-3">
      <span
        aria-hidden
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-xl dark:bg-brand-100/15"
      >
        {icon}
      </span>
      <div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{body}</p>
      </div>
    </div>
  );
}

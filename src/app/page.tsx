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
              <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
                Better learning starts with{" "}
                <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent dark:from-brand-400 dark:to-brand-200">
                  knowing each student
                </span>
                .
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
                Students fill a quick profile — name, photo, a few questions you actually
                wonder about. You see a seating chart of your real classroom, names attached
                to faces. The first week of every term feels less like cold-calling and more
                like meeting people.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link href="/signup">
                  <Button size="lg">I&rsquo;m a teacher</Button>
                </Link>
                <Link href="/join">
                  <Button variant="secondary" size="lg">I&rsquo;m a student</Button>
                </Link>
              </div>
            </div>
            <div className="lg:col-span-2">
              <ClassroomHero className="mx-auto w-full max-w-md drop-shadow-sm" />
            </div>
          </section>
        </div>

      </main>

      <footer className="border-t border-zinc-200 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <Link href="/login" className="underline hover:text-zinc-900 dark:hover:text-zinc-100">
          Sign in
        </Link>
        {" · "}
        <Link href="/join" className="underline hover:text-zinc-900 dark:hover:text-zinc-100">
          Join a class
        </Link>
      </footer>
    </div>
  );
}


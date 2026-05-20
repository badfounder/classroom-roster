import Link from "next/link";
import { redirect } from "next/navigation";
import { normalizeClassCode } from "@/lib/class-code";
import { getPool } from "@/lib/db";
import { AuthShell, Button, Card } from "@/components/ui";

export default async function JoinClassLandingPage({
  params,
}: {
  params: Promise<{ classCode: string }>;
}) {
  const { classCode: raw } = await params;
  const code = normalizeClassCode(decodeURIComponent(raw));
  // Send malformed or unknown codes back to /join with the attempted code
  // attached, so the form can pre-fill it and surface a friendly error.
  // Beats a generic 404 with no recovery path.
  if (code.length !== 6) {
    redirect(`/join?invalid=${encodeURIComponent(code || raw)}`);
  }

  const pool = getPool();
  const { rows } = await pool.query<{ name: string }>(
    `SELECT name FROM classes WHERE class_code = $1`,
    [code]
  );
  const row = rows[0];
  if (!row) {
    redirect(`/join?invalid=${encodeURIComponent(code)}`);
  }

  return (
    <AuthShell>
      <Card>
        <p className="text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Class
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {row.name}
        </h1>
        <p className="mt-6 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          Your teacher uses this to learn names and faces. All information stays on your
          school&rsquo;s server.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link href={`/join/${code}/survey`}>
            <Button size="lg" className="w-full">
              Continue to student form
            </Button>
          </Link>
          <Link href="/join" className="text-center text-sm font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            ← Enter a different code
          </Link>
        </div>
      </Card>
    </AuthShell>
  );
}

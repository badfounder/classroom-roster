import Link from "next/link";
import { redirect } from "next/navigation";
import { normalizeClassCode } from "@/lib/class-code";
import { getPool } from "@/lib/db";
import { SurveyForm } from "./survey-form";

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ classCode: string }>;
}) {
  const { classCode: raw } = await params;
  const code = normalizeClassCode(decodeURIComponent(raw));
  if (code.length !== 6) {
    redirect(`/join?invalid=${encodeURIComponent(code || raw)}`);
  }

  const pool = getPool();
  const { rowCount } = await pool.query(
    `SELECT 1 FROM classes WHERE class_code = $1`,
    [code]
  );
  if (!rowCount) {
    redirect(`/join?invalid=${encodeURIComponent(code)}`);
  }

  return (
    <div>
      <SurveyForm classCode={code} />
      <p className="mx-auto max-w-md px-6 pb-12 text-center text-sm text-zinc-500">
        <Link href={`/join/${code}`} className="underline">
          Back
        </Link>
      </p>
    </div>
  );
}

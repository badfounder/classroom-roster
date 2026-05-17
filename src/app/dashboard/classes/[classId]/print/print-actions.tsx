"use client";

import Link from "next/link";
import { Button } from "@/components/ui";

export function PrintActions({ classId }: { classId: string }) {
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <Button type="button" onClick={() => window.print()}>
        Print / Save as PDF
      </Button>
      <Link
        href={`/dashboard/classes/${classId}`}
        className="text-sm font-medium text-zinc-700 underline hover:text-zinc-900 dark:text-zinc-300"
      >
        Back to class
      </Link>
    </div>
  );
}

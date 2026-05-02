import Link from "next/link";
import { NewClassForm } from "./new-class-form";

export default function NewClassPage() {
  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/dashboard" className="font-medium text-zinc-900 underline dark:text-zinc-100">
          ← Dashboard
        </Link>
      </p>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        New class
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        You will get a class code to share with students and a link to the student form.
      </p>
      <div className="mt-8">
        <NewClassForm />
      </div>
    </div>
  );
}

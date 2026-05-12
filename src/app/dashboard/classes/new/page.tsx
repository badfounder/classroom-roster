import { NewClassForm } from "./new-class-form";
import { Card, NavBack, PageHeader } from "@/components/ui";

export default function NewClassPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <NavBack href="/dashboard" label="Dashboard" />
      <div className="mt-6">
        <PageHeader
          title="New class"
          description="You'll get a class code to share with students and a link to the student survey form."
        />
      </div>
      <Card>
        <NewClassForm />
      </Card>
    </div>
  );
}

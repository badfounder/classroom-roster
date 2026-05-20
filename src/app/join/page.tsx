import { Suspense } from "react";
import { JoinForm } from "./join-form";

export default function JoinPage() {
  // useSearchParams() inside JoinForm requires Suspense for static-render safety.
  return (
    <Suspense fallback={null}>
      <JoinForm />
    </Suspense>
  );
}

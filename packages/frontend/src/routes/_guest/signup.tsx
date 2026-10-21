import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SignUpForm } from "@frontend/components/auth/SignUpForm.tsx";
import { SignUpResult } from "@frontend/components/auth/SignUpResult.tsx";
import type { SignUpResultState } from "@frontend/components/auth/SignUpResult.tsx";

const resultStates: SignUpResultState[] = [
  "success",
  "expired",
  "account-exists",
  "no-access",
];

export const Route = createFileRoute("/_guest/signup")({
  validateSearch: (search: Record<string, unknown>) => ({
    state: resultStates.find((state) => state === search.state),
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const { state: previewState } = Route.useSearch();
  const [resultState, setResultState] = useState<SignUpResultState | undefined>(
    previewState,
  );

  if (resultState) {
    return <SignUpResult state={resultState} />;
  }

  return (
    <SignUpForm
      onSuccess={() => setResultState("success")}
      onAccountExists={() => setResultState("account-exists")}
    />
  );
}

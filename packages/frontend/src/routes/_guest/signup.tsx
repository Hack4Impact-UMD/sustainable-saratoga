import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SignUpForm } from "@frontend/components/auth/SignUpForm.tsx";
import { SignUpResult } from "@frontend/components/auth/SignUpResult.tsx";

export const Route = createFileRoute("/_guest/signup")({
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = Route.useNavigate();
  const [accountExists, setAccountExists] = useState(false);

  if (accountExists) {
    return <SignUpResult state="account-exists" />;
  }

  return (
    <SignUpForm
      onSuccess={() => void navigate({ to: "/" })}
      onAccountExists={() => setAccountExists(true)}
    />
  );
}

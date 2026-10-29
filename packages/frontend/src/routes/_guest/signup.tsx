import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SignUpForm } from "@frontend/components/auth/SignUpForm.tsx";
import { SignUpResult } from "@frontend/components/auth/SignUpResult.tsx";

/**
 * email: the invited address from the invite link; the form locks it in
 */
function validateSearch(search: Record<string, unknown>): { email?: string } {
  const email = search["email"];
  return typeof email === "string" && email.trim() !== ""
    ? { email: email.trim() }
    : {};
}

export const Route = createFileRoute("/_guest/signup")({
  validateSearch,
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = Route.useNavigate();
  const { email } = Route.useSearch();
  const [accountExists, setAccountExists] = useState(false);

  // TODO: Validate the invite itself once invitations exist; for now a link
  // without an email can't be an invite
  if (!email) {
    return <SignUpResult state="expired" />;
  }

  if (accountExists) {
    return <SignUpResult state="account-exists" />;
  }

  return (
    <SignUpForm
      email={email}
      onSuccess={() => void navigate({ to: "/" })}
      onAccountExists={() => setAccountExists(true)}
    />
  );
}

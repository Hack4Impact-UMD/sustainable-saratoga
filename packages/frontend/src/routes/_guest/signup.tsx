import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SignUpForm } from "@frontend/components/auth/SignUpForm";

export const Route = createFileRoute("/_guest/signup")({ component: SignUpPage });

function SignUpPage() {
  const navigate = useNavigate();

  return <SignUpForm onSuccess={() => void navigate({ to: "/" })} />;
}
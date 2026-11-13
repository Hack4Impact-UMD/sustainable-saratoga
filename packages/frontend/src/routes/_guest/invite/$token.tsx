import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SignUpForm } from "@frontend/components/auth/SignUpForm.tsx";
import { SignUpResult } from "@frontend/components/auth/SignUpResult.tsx";
import { trpc } from "@frontend/lib/trpc.ts";

export const Route = createFileRoute("/_guest/invite/$token")({
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();

  const inviteQuery = useQuery(
    trpc.invites.check.queryOptions({ token }),
  );

  function goToLogin() {
    void navigate({ to: "/login" });
  }

  if (inviteQuery.isPending) {
    return <p>Checking your invitation...</p>;
  }

  if (inviteQuery.isError) {
    return <SignUpResult state="expired" onAction={goToLogin} />;
  }

  const invite = inviteQuery.data;

  if (invite.status !== "valid") {
  return (
    <SignUpResult
      state={invite.status}
      onAction={goToLogin}
    />
  );
}

  return (
    <SignUpForm
      email={invite.email}
      token={token}
      onSuccess={() => void navigate({ to: "/" })}
      onAccountExists={goToLogin}
    />
  );
}
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SignUpForm } from "@frontend/components/auth/SignUpForm.tsx";
import { SignUpResult } from "@frontend/components/auth/SignUpResult.tsx";
import { trpc } from "@frontend/lib/trpc.ts";

export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();

  const inviteQuery = useQuery(trpc.invites.check.queryOptions({ token }));

  function goToLogin() {
    void navigate({ to: "/login" });
  }

  if (inviteQuery.isPending) {
    return <p>Checking your invitation...</p>;
  }

  if (inviteQuery.isError) {
    return (
      <div className="min-h-screen w-full pt-[60px] pb-[34px] px-4 md:px-8 max-w-7xl mx-auto text-heading">
        <div className="grid grid-cols-4 md:grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-4 md:col-start-4 md:col-span-6 flex flex-col gap-4 rounded-md bg-page p-4">
            <h1 className="type-h1 text-center">
              Couldn&apos;t check your invitation
            </h1>
            <button
              type="button"
              onClick={() => void inviteQuery.refetch()}
              className="type-btn-primary h-control w-full rounded-full bg-primary px-5"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const invite = inviteQuery.data;

  if (invite.status !== "valid") {
    return (
      <SignUpResult
        state={invite.status}
        email={invite.email}
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

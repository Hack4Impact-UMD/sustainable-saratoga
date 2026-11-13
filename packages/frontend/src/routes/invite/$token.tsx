import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SignUpForm } from "@frontend/components/auth/SignUpForm.tsx";
import { SignUpResult } from "@frontend/components/auth/SignUpResult.tsx";
import { signOut } from "firebase/auth";
import { auth } from "@frontend/lib/firebase.ts";
import { useAuth } from "@frontend/lib/useAuth.ts";
import { useState } from "react";
import { trpc } from "@frontend/lib/trpc.ts";

export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [restoringToken, setRestoringToken] = useState<string>();

  const restoreSignIn = useMutation(
    trpc.invites.restoreSignIn.mutationOptions({ networkMode: "always" }),
  );
  const inviteQuery = useQuery(trpc.invites.check.queryOptions({ token }));

  function goToLogin() {
    void navigate({ to: "/login" });
  }

  function continueAfterLogin() {
    void navigate({
      to: "/login",
      search: { redirect: `/invite/${encodeURIComponent(token)}` },
    });
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

  if (restoringToken === token || invite.status === "restoring") {
    return (
      <main className="mx-auto max-w-md p-4">
        <output>Access restoration is pending. Try signing in shortly.</output>
        <button
          type="button"
          className="type-link block min-h-11"
          onClick={async () => {
            await signOut(auth);
            goToLogin();
          }}
        >
          Sign in
        </button>
      </main>
    );
  }

  if (invite.status !== "valid") {
    return (
      <SignUpResult
        state={invite.status}
        email={invite.email}
        onAction={goToLogin}
      />
    );
  }

  if (user && user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <main className="mx-auto max-w-md p-4">
        <p role="alert">
          Sign in with the account for {invite.email} to accept this invitation.
        </p>
        <button
          type="button"
          className="type-link min-h-11"
          onClick={() => void signOut(auth)}
        >
          Sign out
        </button>
      </main>
    );
  }

  if (!user && invite.canRestoreSignIn) {
    return (
      <main className="mx-auto max-w-md p-4">
        <h1 className="type-h2">Restore your access</h1>
        <p>
          Restore sign-in for {invite.email}, then sign in to accept the
          invitation.
        </p>
        <button
          type="button"
          className="type-link min-h-11"
          disabled={restoreSignIn.isPending}
          onClick={() =>
            restoreSignIn.mutate({ token }, { onSuccess: continueAfterLogin })
          }
        >
          Restore sign-in
        </button>
        {restoreSignIn.isError && (
          <p role="alert">Couldn&apos;t restore sign-in. Try again.</p>
        )}
      </main>
    );
  }

  return (
    <SignUpForm
      email={invite.email}
      token={token}
      onSuccess={() => void navigate({ to: "/" })}
      useExistingAccount={Boolean(user)}
      onAccountExists={continueAfterLogin}
      onRestoring={() => setRestoringToken(token)}
    />
  );
}

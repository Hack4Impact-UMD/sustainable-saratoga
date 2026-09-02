import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { SignInForm } from "@frontend/components/SignInForm.tsx";
import { Section } from "@frontend/components/Section.tsx";
import { useAuth } from "@frontend/lib/useAuth.ts";
import { trpc } from "@frontend/lib/trpc.ts";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user } = useAuth();

  // Public: works with or without a token.
  const hello = useQuery(trpc.hello.queryOptions({ name: "world" }));

  // Protected: the server rejects this with UNAUTHORIZED while signed out.
  const me = useQuery(trpc.me.queryOptions());

  return (
    <>
      <Section title="Public procedure">
        <p data-testid="hello">{hello.data?.greeting ?? "..."}</p>
      </Section>

      <Section title="Protected procedure">
        {me.data ? (
          <p data-testid="me">
            Signed in as{" "}
            <strong className="font-medium">
              {me.data.email ?? me.data.uid}
            </strong>
          </p>
        ) : (
          <p data-testid="me-error">
            {me.isPending ? "..." : "UNAUTHORIZED - sign in below."}
          </p>
        )}
      </Section>

      {user ? null : (
        <Section title="Sign in">
          <SignInForm />
        </Section>
      )}
    </>
  );
}

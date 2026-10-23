import icon from "@frontend/assets/Leaf logo.svg";

/**
 * Props for the signed-in user access message.
 */
export interface NoAccessScreenProps {
  email?: string;
  onUseAnotherAccount: () => void;
}

/**
 * Explains that the signed-in account is not set up for Tree Tracker.
 *
 * The route supplies the account email and handles navigation after the user
 * chooses to return to the sign-in screen.
 */
export function NoAccessScreen({
  email,
  onUseAnotherAccount,
}: NoAccessScreenProps) {
  return (
    <main className="flex min-h-screen justify-center bg-page px-4 py-8">
      <section className="w-full max-w-md text-center">
        <img
          src={icon}
          alt="Sustainable Saratoga"
          className="mx-auto mb-4 h-auto w-24"
        />
        <h1 className="type-h1">No access yet</h1>
        <p className="type-supporting mt-2">
          <strong>{email ?? "This account"}</strong> isn&apos;t set up for the
          tree tracker. Contact your administrator.
        </p>

        {/* Navigation is handled by the route so it can return to the login flow. */}
        <button
          className="type-btn-primary mt-6 h-control w-full rounded-pill bg-primary px-4 hover:bg-primary-hover"
          type="button"
          onClick={onUseAnotherAccount}
        >
          Use another account
        </button>
      </section>
    </main>
  );
}

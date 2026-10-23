import { useEffect, useState } from "react";
import { ClockAlert, MailCheck } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import icon from "@frontend/assets/Leaf logo.svg";
import { auth } from "@frontend/lib/firebase.ts";

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Props for the reset-link confirmation screen.
 */
export interface CheckMailScreenProps {
  email: string;
  onBackToSignIn: () => void;
}

/**
 * Shows where the reset email was sent and manages the resend cooldown.
 */
export function CheckMailScreen({
  email,
  onBackToSignIn,
}: CheckMailScreenProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [resendError, setResendError] = useState(false);

  // The interval only runs while a resend cooldown is active.
  useEffect(() => {
    if (secondsRemaining === 0) return;

    // Re-render once per second so the resend button reflects the cooldown.
    const timer = window.setInterval(() => {
      setSecondsRemaining((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [secondsRemaining]);

  /** Sends another reset email and starts the cooldown after success. */
  async function handleResend() {
    if (!email || secondsRemaining > 0 || isResending) return;

    setIsResending(true);
    setResendError(false);
    try {
      // A successful resend replaces the previous reset link and restarts the timer.
      await sendPasswordResetEmail(auth, email);
      setLinkSent(true);
      setSecondsRemaining(RESEND_COOLDOWN_SECONDS);
    } catch {
      setResendError(true);
    } finally {
      setIsResending(false);
    }
  }

  return (
    <main className="flex min-h-screen justify-center bg-page px-4 py-8">
      <section className="w-full max-w-md text-center">
        <img
          src={icon}
          alt="Sustainable Saratoga"
          className="mx-auto mb-4 h-auto w-24"
        />
        <h1 className="type-h1">Check your email</h1>
        <p className="type-supporting mt-1">
          If <strong>{email || "your email address"}</strong> has an account,
          we&apos;ve sent a reset link.
        </p>

        {/* The banner changes after a successful resend; both states keep the same layout. */}
        {linkSent ? (
          <div className="mt-6 rounded-md border border-line-success bg-selected p-3 text-success">
            <div className="flex items-start gap-3">
              <MailCheck
                className="mt-0.5 shrink-0"
                size={20}
                aria-hidden="true"
              />
              <div className="text-left">
                <p className="type-body-strong text-success">New link sent</p>
                <p className="type-body-sm mt-1 text-success">
                  Use the newest email—earlier links no longer work. This one
                  expires in 1 hour.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-md border border-line-info bg-info-tint p-3 text-info">
            <div className="flex items-start gap-3">
              <ClockAlert
                className="mt-0.5 shrink-0"
                size={20}
                aria-hidden="true"
              />
              <div className="text-left">
                <p className="type-body-strong text-info">
                  The link expires in 1 hour
                </p>
                <p className="type-body-sm mt-1 text-info">
                  Not there after a few minutes? Check your spam folder.
                </p>
              </div>
            </div>
          </div>
        )}

        {resendError ? (
          <p className="type-error mt-3">
            We couldn&apos;t send another link. Please try again.
          </p>
        ) : null}

        {/* Sign-in is always available; resending is disabled during the cooldown. */}
        <div className="mt-6 space-y-3">
          <button
            className="type-btn-primary h-control w-full rounded-pill bg-primary px-4 hover:bg-primary-hover"
            type="button"
            onClick={onBackToSignIn}
          >
            Back to sign in
          </button>
          <button
            className="type-btn-secondary h-control w-full rounded-pill border border-primary bg-surface px-4 hover:bg-hover disabled:cursor-not-allowed disabled:border-divider disabled:text-disabled"
            type="button"
            disabled={secondsRemaining > 0 || !email || isResending}
            onClick={() => void handleResend()}
          >
            {secondsRemaining > 0
              ? `Send another link in 0:${String(secondsRemaining).padStart(2, "0")}`
              : isResending
                ? "Sending..."
                : "Send another link"}
          </button>
        </div>
      </section>
    </main>
  );
}

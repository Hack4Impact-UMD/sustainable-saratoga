import { CircleCheck, Clock3, Info, Leaf } from "lucide-react";
import icon from "@frontend/assets/Leaf logo.svg";

export type SignUpResultState =
  | "success"
  | "expired"
  | "account-exists"
  | "no-access";

// TODO: Replace dummy content
const resultContent: Record<
  SignUpResultState,
  {
    title: string;
    message: string;
    tone: "success" | "warning" | "info" | "plain";
    icon: typeof CircleCheck;
    action: string;
  }
> = {
  success: {
    title: "You’re all set",
    message: "You’re signed in as Jordan Lee (jordan.lee@example.org).",
    tone: "success",
    icon: CircleCheck,
    action: "Open Tree Tracker",
  },
  expired: {
    title: "This invitation has expired",
    message:
      "Ask your administrator to send a new invitation to jordan.lee@example.org.",
    tone: "warning",
    icon: Clock3,
    action: "Back to sign in",
  },
  "account-exists": {
    title: "Account already exists",
    message:
      "Sign in with your password or Google. If you’ve forgotten your password, reset it.",
    tone: "info",
    icon: Info,
    action: "Sign in",
  },
  "no-access": {
    title: "No access yet",
    message:
      "priya.personal@example.com isn’t set up for the tree tracker. Contact your administrator.",
    tone: "plain",
    icon: Leaf,
    action: "Use another account",
  },
};

const noticeStyles = {
  success: "border-line-success bg-selected text-success",
  warning: "border-line-warning bg-attention text-warning",
  info: "border-line-info bg-info-tint text-info",
  plain: "",
};

export function SignUpResult({ state }: { state: SignUpResultState }) {
  const result = resultContent[state];
  const Icon = result.icon;
  const isPlain = result.tone === "plain";

  return (
    <div className="min-h-screen w-full pt-[60px] pb-[34px] px-4 md:px-8 max-w-7xl mx-auto text-heading">
      <div className="grid grid-cols-4 md:grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-4 md:col-start-4 md:col-span-6 flex flex-col gap-4 rounded-md bg-page p-4">
        <header>
          <img src={icon} alt="Sustainable Saratoga Logo" className="w-20 h-20 mx-auto" />
          <h1 className="type-h1 text-center">{result.title}</h1>
        </header>

        {isPlain ? (
          <p className="type-supporting text-center">{result.message}</p>
        ) : (
          <div className={`flex items-start gap-2 rounded-md border px-3 py-3 ${noticeStyles[result.tone]}`}>
            <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div className="flex flex-col gap-1">
              {state === "success" && (
                <h2 className="font-bold">
                  Your account is ready
                </h2>
              )}
              {state === "expired" && (
                <>
                  <h2 className="font-bold">
                    Invitations work for 7 days
                  </h2>
                  <p className="type-caption">{result.message}</p>
                </>
              )}
              {state === "account-exists" && (
                <>
                  <h2 className="font-bold">
                    An account already exists for jordan.lee@example.org
                  </h2>
                  <p className="type-caption">{result.message}</p>
                </>
              )}
              {state === "success" && (
                <p className="type-caption">{result.message}</p>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          className={
            state === "expired"
              ? "type-btn-secondary h-control w-full rounded-full border border-primary bg-surface px-5"
              : "type-btn-primary h-control w-full rounded-full bg-primary px-5"
          }
        >
          {result.action}
        </button>

        {state === "account-exists" && (
          <button type="button" className="type-link type-caption text-center">
            Forgot password?
          </button>
        )}
      </div>
    </div>
    </div>
  );
}

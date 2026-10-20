import { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import icon from "@frontend/assets/Leaf logo.svg";
import { Input } from "@frontend/components/ui/input";
import { Field, FieldLabel } from "@frontend/components/ui/field";

export function SignUpForm() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <div className="min-h-screen w-full pt-[60px] pb-[34px] px-4 md:px-8 max-w-7xl mx-auto text-heading">
      <div className="grid grid-cols-4 md:grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-4 md:col-start-4 md:col-span-6 flex flex-col gap-4 bg-page p-4">
          <header>
            <img src={icon} alt="Leaf Logo" className="w-20 h-20 mx-auto" />
            <h1 className="type-h1 text-center">Create Account</h1>
          </header>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => e.preventDefault()}
          >
            <Field className="text-bold">
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <div className="relative w-full">
                <Input
                  id="email"
                  placeholder="name@example.org"
                  className="h-12 rounded-input border border-line-strong bg-surface px-4 pr-12"
                  required
                  disabled
                />
                <LockKeyhole
                  aria-hidden="true"
                  className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-icon-secondary"
                />
              </div>
            </Field>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                placeholder="Your Name"
                className="bg-surface border border-line-strong px-4 h-12 rounded-input"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Create a Password</FieldLabel>
              <div className="relative w-full">
                <Input
                  id="password"
                  type={isPasswordVisible ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-12 rounded-input border border-line-strong bg-surface px-4 pr-12"
                  required
                />
                <button
                  type="button"
                  aria-label={
                    isPasswordVisible ? "Hide password" : "Show password"
                  }
                  aria-pressed={isPasswordVisible}
                  onClick={() => setIsPasswordVisible((visible) => !visible)}
                  className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-icon-secondary hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  {isPasswordVisible ? (
                    <EyeOff aria-hidden="true" className="size-5" />
                  ) : (
                    <Eye aria-hidden="true" className="size-5" />
                  )}
                </button>
              </div>
            </Field>

            <div className="bg-pressed py-3 px-4 rounded-md">
              <h2 className="font-bold">Your password needs</h2>
              <ul>
                <li>At least 8 characters</li>
              </ul>
            </div>

            <div>
              <button
                type="submit"
                className="type-btn-primary h-control w-full rounded-full bg-primary px-5 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create Account
              </button>
              <div
                className="flex items-center gap-6 py-4"
                role="separator"
                aria-label="or"
              >
                <span className="h-px flex-1 bg-divider" />
                <span className="type-body text-body-muted">or</span>
                <span className="h-px flex-1 bg-divider" />
              </div>
              <button
                type="button"
                className="type-btn-secondary flex h-control w-full items-center justify-center gap-3 rounded-full border border-primary bg-surface px-5 hover:bg-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
              >
                <span
                  aria-hidden="true"
                  className="grid size-8 shrink-0 place-items-center rounded-md border-2 border-dashed border-line-strong font-bold"
                >
                  G
                </span>
                <span>Continue with Google</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

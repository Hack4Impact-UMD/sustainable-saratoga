import { useMutation } from "@tanstack/react-query";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useState } from "react";
import { auth } from "@frontend/lib/firebase.ts";

/**
 * Email and password sign-in against the Auth emulator. Creating the account
 * on a failed sign-in keeps the first run of the template to one click.
 */
export function SignInForm() {
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("password123");

  const signIn = useMutation({
    mutationFn: async () => {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    },
  });

  const field =
    "min-w-40 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700";

  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        signIn.mutate();
      }}
    >
      <input
        type="email"
        value={email}
        data-testid="email"
        aria-label="Email"
        onChange={(event) => setEmail(event.target.value)}
        className={field}
      />
      <input
        type="password"
        value={password}
        data-testid="password"
        aria-label="Password"
        onChange={(event) => setPassword(event.target.value)}
        className={field}
      />
      <button
        type="submit"
        data-testid="sign-in"
        disabled={signIn.isPending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        Sign in
      </button>
      {signIn.error ? (
        <p role="alert" className="basis-full text-sm text-red-600">
          {signIn.error.message}
        </p>
      ) : null}
    </form>
  );
}

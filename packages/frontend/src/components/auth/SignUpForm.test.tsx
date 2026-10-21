import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { User } from "firebase/auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const firebase = vi.hoisted(() => ({
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: firebase.createUserWithEmailAndPassword,
  updateProfile: firebase.updateProfile,
}));

vi.mock("@frontend/lib/firebase.ts", () => ({ auth: {} }));

import { SignUpForm } from "@frontend/components/auth/SignUpForm.tsx";
import { SignUpResult } from "@frontend/components/auth/SignUpResult.tsx";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

const createdUser = { uid: "new-user" } as User;

function renderSignUpForm() {
  const onSuccess = vi.fn();
  const onAccountExists = vi.fn();
  render(
    <SignUpForm
      onSuccess={onSuccess}
      onAccountExists={onAccountExists}
    />,
  );
  return { onSuccess, onAccountExists };
}

function fillForm({ name = "", password = "" } = {}) {
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: name },
  });
  fireEvent.change(screen.getByLabelText("Create a Password"), {
    target: { value: password },
  });
}

describe("SignUpForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firebase.createUserWithEmailAndPassword.mockResolvedValue({
      user: createdUser,
    });
    firebase.updateProfile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a summary, field errors, and focuses the first invalid field", () => {
    renderSignUpForm();

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(
      screen.getByText("Fix 2 things to create your account").closest('[role="alert"]'),
    ).toBeInTheDocument();
    expect(screen.getByText("Enter your name.")).toBeInTheDocument();
    expect(screen.getByText(/Password needs:/)).toHaveTextContent(
      "At least 8 characters",
    );
    expect(screen.getByLabelText("Name")).toHaveFocus();
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it("shows only the password error and focuses the password field", () => {
    renderSignUpForm();
    fillForm({ name: "Alex", password: "short" });

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(
      screen.getByText("Fix 1 thing to create your account").closest('[role="alert"]'),
    ).toBeInTheDocument();
    expect(screen.queryByText("Enter your name.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Create a Password")).toHaveFocus();
  });

  it("creates the account with the invited email, sets the name, and calls onSuccess", async () => {
    const { onSuccess } = renderSignUpForm();
    fillForm({ name: "Alex Doe", password: "Password123!" });

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    const invitedEmail = screen.getByLabelText("Email") as HTMLInputElement;
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      invitedEmail.value,
      "Password123!",
    );
    expect(updateProfile).toHaveBeenCalledWith(createdUser, {
      displayName: "Alex Doe",
    });
  });

  it("disables submission while Firebase is creating the account", async () => {
    let resolveCreate:
      | ((value: { user: User }) => void)
      | undefined;
    firebase.createUserWithEmailAndPassword.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    renderSignUpForm();
    fillForm({ name: "Alex", password: "Password123!" });

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    const submitButton = screen.getByRole("button", {
      name: "Creating Account...",
    });
    expect(submitButton).toBeDisabled();

    resolveCreate?.({ user: createdUser });
    await waitFor(() => expect(submitButton).toBeEnabled());
  });

  it("shows the account-exists result when the invite already has an account", async () => {
    firebase.createUserWithEmailAndPassword.mockRejectedValue(
      Object.assign(new Error("Account exists"), {
        code: "auth/email-already-in-use",
      }),
    );
    const { onAccountExists } = renderSignUpForm();
    fillForm({ name: "Alex", password: "Password123!" });

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => expect(onAccountExists).toHaveBeenCalledOnce());
  });

  it.each([
    { password: "Abcdefg1", requirement: "At least 1 special symbol" },
    { password: "Abcdefg!", requirement: "At least 1 number" },
    { password: "abcdefg1!", requirement: "At least 1 uppercase letter" },
    { password: "ABCDEFG1!", requirement: "At least 1 lowercase letter" },
    { password: "Abc1!", requirement: "At least 8 characters" },
  ])(
    "rejects a password that fails $requirement",
    ({ password, requirement }) => {
      renderSignUpForm();
      fillForm({ name: "Alex", password });

      fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

      expect(screen.getByText(/Password needs:/)).toHaveTextContent(
        requirement,
      );
      expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    },
  );

  it("marks all password requirements as met after a valid submission", async () => {
    renderSignUpForm();
    fillForm({ name: "Alex", password: "Password123!" });

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() =>
      expect(createUserWithEmailAndPassword).toHaveBeenCalledOnce(),
    );
    for (const requirement of [
      "At least 8 characters",
      "At least 1 special symbol",
      "At least 1 number",
      "At least 1 uppercase letter",
      "At least 1 lowercase letter",
    ]) {
      expect(screen.getByText(requirement).closest("li")).toHaveClass(
        "text-success",
      );
    }
  });

  it.each([
    ["success", "You’re all set", "Open Tree Tracker"],
    ["expired", "This invitation has expired", "Back to sign in"],
    ["account-exists", "Account already exists", "Sign in"],
    ["no-access", "No access yet", "Use another account"],
  ] as const)("renders the static %s result state", (state, title, action) => {
    render(<SignUpResult state={state} />);

    expect(
      screen.getByRole("heading", { name: title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: action }),
    ).toBeInTheDocument();
  });
});

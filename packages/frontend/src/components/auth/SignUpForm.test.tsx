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
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

const createdUser = { uid: "new-user" } as User;

function renderSignUpForm() {
  const onSuccess = vi.fn();
  render(<SignUpForm onSuccess={onSuccess} />);
  return { onSuccess };
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
    expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument();
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
    fillForm({ name: "Alex Doe", password: "password123" });

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    const invitedEmail = screen.getByLabelText("Email") as HTMLInputElement;
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      invitedEmail.value,
      "password123",
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
    fillForm({ name: "Alex", password: "password123" });

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    const submitButton = screen.getByRole("button", {
      name: "Creating Account...",
    });
    expect(submitButton).toBeDisabled();

    resolveCreate?.({ user: createdUser });
    await waitFor(() => expect(submitButton).toBeEnabled());
  });

  it("shows a helpful message when the invite already has an account", async () => {
    firebase.createUserWithEmailAndPassword.mockRejectedValue(
      Object.assign(new Error("Account exists"), {
        code: "auth/email-already-in-use",
      }),
    );
    renderSignUpForm();
    fillForm({ name: "Alex", password: "password123" });

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(
      await screen.findByText("An account already exists for this invite."),
    ).toBeInTheDocument();
  });
});

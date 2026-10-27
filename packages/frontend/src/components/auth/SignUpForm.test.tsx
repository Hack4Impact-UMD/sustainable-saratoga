import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Auth, User } from "firebase/auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignUpForm } from "@frontend/components/auth/SignUpForm.tsx";
import { SignUpResult } from "@frontend/components/auth/SignUpResult.tsx";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

const firebase = vi.hoisted(() => ({
  createUserWithEmailAndPassword:
    vi.fn<
      (auth: Auth, email: string, password: string) => Promise<{ user: User }>
    >(),
  updateProfile:
    vi.fn<
      (user: User, profile: { displayName?: string | null }) => Promise<void>
    >(),
}));

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: firebase.createUserWithEmailAndPassword,
  updateProfile: firebase.updateProfile,
}));

vi.mock("@frontend/lib/firebase.ts", () => ({ auth: {} }));

const createdUser = { uid: "new-user" } as User;

function renderSignUpForm() {
  const onSuccess = vi.fn<() => void>();
  const onAccountExists = vi.fn<() => void>();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SignUpForm onSuccess={onSuccess} onAccountExists={onAccountExists} />
    </QueryClientProvider>,
  );
  return { onSuccess, onAccountExists };
}

function fillForm({
  firstName = "",
  lastName = "",
  password = "",
  confirmPassword = "",
  role = "",
} = {}) {
  fireEvent.change(screen.getByLabelText("First Name"), {
    target: { value: firstName },
  });
  fireEvent.change(screen.getByLabelText("Last Name"), {
    target: { value: lastName },
  });
  fireEvent.change(screen.getByLabelText("Create a Password"), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText("Confirm Password"), {
    target: { value: confirmPassword },
  });
  fireEvent.change(screen.getByLabelText("Volunteer role"), {
    target: { value: role },
  });
}

describe("SignUpForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/");
    firebase.createUserWithEmailAndPassword.mockResolvedValue({
      user: createdUser,
    });
    firebase.updateProfile.mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
  });

  it("shows shared schema errors and focuses the first invalid field", () => {
    renderSignUpForm();

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(
      screen
        .getByText("Fix 6 things to create your account")
        .closest('[role="alert"]'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.getByLabelText("First Name")).toHaveFocus();
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Confirm Password")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Volunteer role")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it("shows the shared password error and focuses the password field", () => {
    renderSignUpForm();
    fillForm({
      firstName: "Alex",
      lastName: "Doe",
      password: "passwordonly",
      confirmPassword: "passwordonly",
      role: "planter",
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(
      screen.getByText(
        "Password must be at least 8 characters and include a letter and a number",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Create a Password")).toHaveFocus();
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    const requirements = screen
      .getByText("Your password needs")
      .parentElement?.querySelectorAll("li");
    expect(requirements?.[0]).toHaveClass("text-success");
    expect(requirements?.[0]?.querySelector("svg")).toHaveClass(
      "lucide-circle-check",
    );
    expect(requirements?.[1]).toHaveClass("text-success");
    expect(requirements?.[1]?.querySelector("svg")).toHaveClass(
      "lucide-circle-check",
    );
    expect(requirements?.[2]).toHaveClass("text-destructive");
    expect(requirements?.[2]?.querySelector("svg")).toHaveClass(
      "lucide-circle-x",
    );
  });

  it("updates password requirement indicators as the user types", () => {
    renderSignUpForm();
    const password = screen.getByLabelText("Create a Password");
    const requirements = screen
      .getByText("Your password needs")
      .parentElement?.querySelectorAll("li");

    expect(requirements?.[0]?.querySelector("svg")).toHaveClass(
      "lucide-circle",
    );

    fireEvent.change(password, { target: { value: "pass" } });
    expect(requirements?.[0]).toHaveClass("text-destructive");
    expect(requirements?.[1]).toHaveClass("text-success");
    expect(requirements?.[2]).toHaveClass("text-destructive");

    fireEvent.change(password, { target: { value: "password" } });
    expect(requirements?.[0]).toHaveClass("text-success");
    expect(requirements?.[1]).toHaveClass("text-success");
    expect(requirements?.[2]).toHaveClass("text-destructive");

    fireEvent.change(password, { target: { value: "password1" } });
    requirements?.forEach((requirement) => {
      expect(requirement).toHaveClass("text-success");
      expect(requirement.querySelector("svg")).toHaveClass(
        "lucide-circle-check",
      );
    });
  });

  it("reports a mismatch on the confirm password field", () => {
    window.history.replaceState({}, "", "/signup?email=invite%40example.org");
    renderSignUpForm();
    fillForm({
      firstName: "Alex",
      lastName: "Doe",
      password: "password123",
      confirmPassword: "password321",
      role: "planter",
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(screen.getByLabelText("Confirm Password")).toHaveFocus();
    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it("prefills email from the URL and creates the account with that email", async () => {
    window.history.replaceState({}, "", "/signup?email=invite%40example.org");
    const { onSuccess } = renderSignUpForm();
    expect(screen.getByLabelText("Email")).toHaveValue("invite@example.org");
    fillForm({
      firstName: " Alex ",
      lastName: "Doe ",
      password: "password123",
      confirmPassword: "password123",
      role: "planter",
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      "invite@example.org",
      "password123",
    );
    expect(updateProfile).toHaveBeenCalledWith(createdUser, {
      displayName: "Alex Doe",
    });
    const requirements = screen
      .getByText("Your password needs")
      .parentElement?.querySelectorAll("li");
    requirements?.forEach((requirement) => {
      expect(requirement).toHaveClass("text-success");
      expect(requirement.querySelector("svg")).toHaveClass(
        "lucide-circle-check",
      );
    });
  });

  it("disables submission while Firebase is creating the account", async () => {
    let resolveCreate!: (value: { user: User }) => void;
    firebase.createUserWithEmailAndPassword.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    window.history.replaceState({}, "", "/signup?email=invite%40example.org");
    renderSignUpForm();
    fillForm({
      firstName: "Alex",
      lastName: "Doe",
      password: "password123",
      confirmPassword: "password123",
      role: "planter",
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    const submitButton = screen.getByRole("button", {
      name: "Creating Account...",
    });
    expect(submitButton).toBeDisabled();

    resolveCreate({ user: createdUser });
    await waitFor(() => expect(submitButton).toBeEnabled());
  });

  it("shows the account-exists result when the invite already has an account", async () => {
    firebase.createUserWithEmailAndPassword.mockRejectedValue(
      Object.assign(new Error("Account exists"), {
        code: "auth/email-already-in-use",
      }),
    );
    window.history.replaceState({}, "", "/signup?email=invite%40example.org");
    const { onAccountExists } = renderSignUpForm();
    fillForm({
      firstName: "Alex",
      lastName: "Doe",
      password: "password123",
      confirmPassword: "password123",
      role: "planter",
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => expect(onAccountExists).toHaveBeenCalledOnce());
  });

  it.each([
    ["success", "You’re all set", "Open Tree Tracker"],
    ["expired", "This invitation has expired", "Back to sign in"],
    ["account-exists", "Account already exists", "Sign in"],
    ["no-access", "No access yet", "Use another account"],
  ] as const)("renders the static %s result state", (state, title, action) => {
    render(<SignUpResult state={state} />);

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: action })).toBeInTheDocument();
  });
});

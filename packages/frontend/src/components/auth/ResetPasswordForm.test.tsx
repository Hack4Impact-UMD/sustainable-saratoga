import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordForm } from "@frontend/components/auth/ResetPasswordForm.tsx";

vi.mock("@frontend/lib/firebase.ts", () => ({ auth: {} }));
vi.mock("firebase/auth", () => ({
  confirmPasswordReset: vi.fn<typeof confirmPasswordReset>(),
  verifyPasswordResetCode: vi.fn<typeof verifyPasswordResetCode>(),
}));

function renderForm(oobCode = "reset-code") {
  return render(
    <ResetPasswordForm
      oobCode={oobCode}
      onSuccess={vi.fn<() => void>()}
      onSendNewLink={vi.fn<() => void>()}
      onBackToSignIn={vi.fn<() => void>()}
    />,
  );
}

beforeEach(() => {
  vi.mocked(verifyPasswordResetCode).mockResolvedValue("person@example.org");
  vi.mocked(confirmPasswordReset).mockResolvedValue();
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("reset-link verification", () => {
  it.each([
    ["auth/expired-action-code", "This link has expired"],
    ["auth/invalid-action-code", "This link was already used"],
  ])("maps %s to its link status", async (code, heading) => {
    vi.mocked(verifyPasswordResetCode).mockRejectedValueOnce({ code });
    renderForm();
    expect(
      await screen.findByRole("heading", { name: heading }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Try again")).not.toBeInTheDocument();
  });

  it.each([{ code: "auth/network-request-failed" }, new Error("Unavailable")])(
    "lets the user retry a verification failure: %o",
    async (failure) => {
      vi.mocked(verifyPasswordResetCode).mockRejectedValueOnce(failure);
      renderForm();
      fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
      expect(await screen.findByLabelText("New password")).toBeInTheDocument();
      expect(verifyPasswordResetCode).toHaveBeenCalledTimes(2);
      expect(verifyPasswordResetCode).toHaveBeenLastCalledWith(
        {},
        "reset-code",
      );
    },
  );

  it("ignores a stale verification result after the code changes", async () => {
    let failOldCheck!: (error: unknown) => void;
    vi.mocked(verifyPasswordResetCode).mockImplementationOnce(
      () => new Promise((_resolve, reject) => (failOldCheck = reject)),
    );
    const { rerender } = renderForm("old-code");
    rerender(
      <ResetPasswordForm
        oobCode="new-code"
        onSuccess={vi.fn<() => void>()}
        onSendNewLink={vi.fn<() => void>()}
        onBackToSignIn={vi.fn<() => void>()}
      />,
    );
    await screen.findByLabelText("New password");
    failOldCheck({ code: "auth/expired-action-code" });
    await waitFor(() =>
      expect(verifyPasswordResetCode).toHaveBeenCalledTimes(2),
    );
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
  });
});

describe("reset submission", () => {
  it.each([
    ["auth/expired-action-code", "This link has expired"],
    ["auth/invalid-action-code", "This link was already used"],
  ])("maps %s to its link status", async (code, heading) => {
    vi.mocked(confirmPasswordReset).mockRejectedValueOnce({ code });
    renderForm();
    await fillAndSubmit();
    expect(
      await screen.findByRole("heading", { name: heading }),
    ).toBeInTheDocument();
  });

  it.each([
    ["auth/weak-password", "Choose a stronger password."],
    [
      "auth/network-request-failed",
      "We couldn't save your password. Please try again.",
    ],
  ])("keeps the form and allows resubmission for %s", async (code, message) => {
    vi.mocked(confirmPasswordReset).mockRejectedValueOnce({ code });
    renderForm();
    await fillAndSubmit();
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toHaveValue(
      "a-long-password",
    );
    fireEvent.click(screen.getByRole("button", { name: "Save new password" }));
    expect(
      await screen.findByRole("heading", { name: "Password updated" }),
    ).toBeInTheDocument();
    expect(confirmPasswordReset).toHaveBeenCalledTimes(2);
  });
});

async function fillAndSubmit() {
  fireEvent.change(await screen.findByLabelText("New password"), {
    target: { value: "a-long-password" },
  });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: { value: "a-long-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save new password" }));
}

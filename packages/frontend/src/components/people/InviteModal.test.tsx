import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InviteModal } from "@frontend/components/people/InviteModal.tsx";

function openInviteDialog() {
  render(<InviteModal />);
  fireEvent.click(screen.getByRole("button", { name: "Invite" }));
  return screen.getByRole("textbox", { name: "Email addresses" });
}

describe("InviteModal email chips", () => {
  afterEach(cleanup);

  it("adds an address with Enter and a delimiter", () => {
    const input = openInviteDialog();
    expect(input).toHaveAttribute("placeholder", "name@example.org, ...");

    fireEvent.change(input, { target: { value: "first@example.org" } });
    expect(input).not.toHaveAttribute("placeholder");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input).not.toHaveAttribute("placeholder");
    fireEvent.change(input, { target: { value: "second@example.org" } });
    fireEvent.keyDown(input, { key: " " });

    expect(
      screen.getByRole("button", { name: "Remove first@example.org" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove second@example.org" }),
    ).toBeInTheDocument();
  });

  it("restores the placeholder after the draft and all chips are removed", () => {
    const input = openInviteDialog();

    fireEvent.change(input, { target: { value: "draft@example.org" } });
    expect(input).not.toHaveAttribute("placeholder");

    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.click(
      screen.getByRole("button", { name: "Remove draft@example.org" }),
    );

    expect(input).toHaveAttribute("placeholder", "name@example.org, ...");
  });

  it("splits pasted addresses and ignores duplicates", () => {
    const input = openInviteDialog();

    fireEvent.paste(input, {
      clipboardData: {
        getData: () =>
          "first@example.org, second@example.org\nFIRST@example.org",
      },
    });

    expect(
      screen.getAllByRole("button", { name: /Remove .*@example\.org/ }),
    ).toHaveLength(2);
  });

  it("marks invalid addresses and describes how to fix them", async () => {
    const input = openInviteDialog();

    fireEvent.change(input, { target: { value: "casey@example" } });
    fireEvent.keyDown(input, { key: "Enter" });

    const chipTrigger = screen.getByRole("button", {
      name: "Invalid email address: casey@example",
    });
    const descriptionId = chipTrigger.getAttribute("aria-describedby");
    expect(document.getElementById(descriptionId ?? "")).toHaveTextContent(
      'Not a valid email address. Check "casey@example" for typos. It should look like name@example.org.',
    );

    fireEvent.focus(chipTrigger);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Not a valid email address",
    );
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      'Check "casey@example" for typos. It should look like name@example.org.',
    );
  });

  it("counts every chip and enables sending only when all addresses are valid", () => {
    const input = openInviteDialog();
    const sendButton = screen.getByRole("button", {
      name: "Send 0 invites",
    });

    expect(sendButton).toBeDisabled();

    fireEvent.change(input, {
      target: { value: "first@example.org" },
    });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByRole("button", { name: "Send 1 invite" })).toBeEnabled();

    fireEvent.change(input, { target: { value: "invalid-address" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(
      screen.getByRole("button", { name: "Send 2 invites" }),
    ).toBeDisabled();
  });

  it("removes chips with their button or Backspace", () => {
    const input = openInviteDialog();

    fireEvent.change(input, { target: { value: "first@example.org" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "second@example.org" } });
    fireEvent.keyDown(input, { key: "Enter" });

    fireEvent.click(
      screen.getByRole("button", { name: "Remove first@example.org" }),
    );
    fireEvent.keyDown(input, { key: "Backspace" });

    expect(
      screen.queryByRole("button", { name: /Remove .*@example\.org/ }),
    ).not.toBeInTheDocument();
  });
});

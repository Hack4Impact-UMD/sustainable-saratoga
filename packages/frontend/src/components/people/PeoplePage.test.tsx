import type { Person } from "@repo/common";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PeoplePage } from "@frontend/components/people/PeoplePage.tsx";
import type { resendInvite } from "@backend/services/inviteManagement.ts";

type InviteResendResult = Awaited<ReturnType<typeof resendInvite>>;
type TestInviteMutations = {
  resend(input: { inviteId: string }): Promise<InviteResendResult>;
  cancel(input: { inviteId: string }): Promise<{ ok: true }>;
};

const queryState = vi.hoisted(() => ({
  people: [] as Person[],
  resend: vi.fn<TestInviteMutations["resend"]>(),
  cancel: vi.fn<TestInviteMutations["cancel"]>(),
  error: false,
  pending: false,
  fetches: 0,
  hangRefetch: false,
  refetchError: false,
  removeCalls: [] as { uid: string }[],
  removeMode: "ok" as "ok" | "hang" | "throw" | "queued" | "offline",
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@frontend/lib/trpc.ts", () => ({
  trpc: {
    invites: {
      resend: { mutationOptions: () => ({ mutationFn: queryState.resend }) },
      cancel: { mutationOptions: () => ({ mutationFn: queryState.cancel }) },
    },
    people: {
      list: {
        queryKey: () => ["people", "list"],
        queryOptions: () => ({
          queryKey: ["people", "list"],
          queryFn: () => {
            queryState.fetches += 1;
            if (queryState.pending) return new Promise<Person[]>(() => {});
            if (queryState.fetches > 1 && queryState.hangRefetch) {
              return new Promise<Person[]>(() => {});
            }
            if (queryState.fetches > 1 && queryState.refetchError) {
              return Promise.reject(new Error("refresh failed"));
            }
            if (queryState.error)
              return Promise.reject(new Error("load failed"));
            return Promise.resolve(queryState.people);
          },
        }),
      },
      removeAccess: {
        mutationOptions: () => ({
          mutationFn: (input: { uid: string }) => {
            queryState.removeCalls.push(input);
            if (queryState.removeMode === "hang") {
              return new Promise<{ uid: string }>(() => {});
            }
            if (queryState.removeMode === "throw") {
              return Promise.reject(new Error("Auth failed"));
            }
            if (queryState.removeMode === "queued") {
              return Promise.reject({ data: { queuedOffline: true } });
            }
            if (queryState.removeMode === "offline") {
              return Promise.reject(new TypeError("Failed to fetch"));
            }
            queryState.people = queryState.people.filter(
              (person) => person.id !== input.uid,
            );
            return Promise.resolve({ uid: input.uid });
          },
        }),
      },
    },
  },
}));

const rows: Person[] = [
  {
    id: "invite-new",
    name: "New invite",
    email: "new@example.com",
    role: "volunteer",
    status: "pending",
    invitedAt: "2026-10-21T00:00:00.000Z",
    expiresAt: "2026-10-28T00:00:00.000Z",
    isSelf: false,
  },
  {
    id: "invite-old",
    name: "Old invite",
    email: "old@example.com",
    role: "admin",
    status: "expired",
    invitedAt: "2026-09-02T00:00:00.000Z",
    expiresAt: "2026-09-09T00:00:00.000Z",
    isSelf: false,
  },
  {
    id: "member-self",
    name: "Dana Ruiz",
    email: "dana@example.com",
    role: "admin",
    status: "active",
    invitedAt: null,
    expiresAt: null,
    isSelf: true,
  },
  {
    id: "member-volunteer",
    name: "Leo Brandt",
    email: "leo@example.com",
    role: "volunteer",
    status: "active",
    invitedAt: null,
    expiresAt: null,
    isSelf: false,
  },
];

const readyInvites: TestInviteMutations = {
  resend: () => Promise.reject(new Error("Unexpected resend.")),
  cancel: () => Promise.resolve({ ok: true }),
};

function renderPage(inviteMutations = readyInvites) {
  queryState.resend.mockImplementation(inviteMutations.resend);
  queryState.cancel.mockImplementation(inviteMutations.cancel);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <PeoplePage />
    </QueryClientProvider>,
  );

  return queryClient;
}

async function openMenu(name: string) {
  fireEvent.click(
    await screen.findByRole("button", { name: `More actions for ${name}` }),
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  queryState.people = rows.map((person) => ({ ...person }));
  queryState.error = false;
  queryState.pending = false;
  queryState.fetches = 0;
  queryState.hangRefetch = false;
  queryState.refetchError = false;
  queryState.removeCalls = [];
  queryState.removeMode = "ok";
});

describe("PeoplePage", () => {
  it("preserves invite-first ordering and renders statuses", async () => {
    renderPage();

    const listItems = await screen.findAllByRole("listitem");
    expect(listItems.map((item) => item.textContent)).toEqual([
      expect.stringContaining("New invite"),
      expect.stringContaining("Old invite"),
      expect.stringContaining("Dana Ruiz (you)"),
      expect.stringContaining("Leo Brandt"),
    ]);
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.getByText("Invited Oct 21")).toBeInTheDocument();
    expect(screen.getByText("Sent Sep 2 · link expired")).toBeInTheDocument();
  });

  it("filters rows by name or email", async () => {
    renderPage();

    const search = await screen.findByRole("searchbox", {
      name: "Search name or email",
    });
    fireEvent.change(search, { target: { value: "leo@example.com" } });

    expect(screen.getByText("1", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("Leo Brandt")).toBeInTheDocument();
    expect(screen.queryByText("New invite")).not.toBeInTheDocument();
  });

  it("does not render a more-actions button for the current user", async () => {
    renderPage();

    await screen.findByText("Dana Ruiz (you)");
    expect(
      screen.queryByRole("button", { name: "More actions for Dana Ruiz" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "More actions for New invite" }),
    ).toBeInTheDocument();
  });

  it("renders loading and error states", async () => {
    queryState.pending = true;
    renderPage();
    expect(screen.getByText("Loading people...")).toBeInTheDocument();

    cleanup();
    queryState.pending = false;
    queryState.error = true;
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The people list couldn't load.",
    );
  });

  it("renders an empty state when search has no matches", async () => {
    renderPage();

    const search = await screen.findByRole("searchbox", {
      name: "Search name or email",
    });
    fireEvent.change(search, { target: { value: "missing" } });

    expect(
      screen.getByText("No people match your search."),
    ).toBeInTheDocument();
  });

  it("opens a different menu for active, pending, and expired rows", async () => {
    renderPage(readyInvites);

    await openMenu("Leo Brandt");
    expect(
      await screen.findByRole("menuitem", { name: "Remove access" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Resend invite" }),
    ).not.toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });

    await openMenu("New invite");
    expect(
      await screen.findByRole("menuitem", { name: "Resend invite" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Cancel invite" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Remove access" }),
    ).not.toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });

    await openMenu("Old invite");
    expect(
      await screen.findByRole("menuitem", { name: "Remove invite" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Resend invite" }),
    ).toBeInTheDocument();
  });

  it("does not remove access when the dialog is dismissed", async () => {
    renderPage(readyInvites);
    await openMenu("Leo Brandt");
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Remove access" }),
    );

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveAccessibleName("Remove Leo Brandt's access?");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(queryState.removeCalls).toEqual([]);
    expect(
      screen.getByRole("button", { name: "More actions for Leo Brandt" }),
    ).toHaveFocus();
  });

  it("ignores a second click while removal is in flight", async () => {
    queryState.removeMode = "hang";
    renderPage(readyInvites);
    await openMenu("Leo Brandt");
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Remove access" }),
    );
    const confirm = await screen.findByRole("button", {
      name: "Remove access",
    });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(
      await screen.findByRole("button", { name: "Removing…" }),
    ).toHaveAttribute("aria-busy", "true");
    expect(queryState.removeCalls).toEqual([{ uid: "member-volunteer" }]);
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("removes the row and announces success before the refetch finishes", async () => {
    queryState.hangRefetch = true;
    renderPage(readyInvites);
    await openMenu("Leo Brandt");
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Remove access" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Remove access" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Leo Brandt's access was removed.",
    );
    expect(screen.queryByText("Leo Brandt")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "More actions for Old invite" }),
      ).toHaveFocus();
    });
  });

  it("keeps the dialog usable when removal fails on the server", async () => {
    queryState.removeMode = "throw";
    renderPage(readyInvites);
    await openMenu("Leo Brandt");
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Remove access" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Remove access" }),
    );

    expect(
      await screen.findByText("Couldn't finish removing access. Try again."),
    ).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Leo Brandt")).toBeInTheDocument();
  });

  it("uses unchanged-state copy when removal is known to be offline", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    renderPage(readyInvites);
    await openMenu("Leo Brandt");
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Remove access" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Remove access" }),
    );

    expect(
      await screen.findByText("You're offline. Nothing was changed."),
    ).toBeInTheDocument();
    expect(queryState.removeCalls).toEqual([]);
    vi.restoreAllMocks();
  });

  it("does not announce success when removal was queued offline", async () => {
    queryState.removeMode = "queued";
    renderPage(readyInvites);
    await openMenu("Leo Brandt");
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Remove access" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Remove access" }),
    );

    expect(
      await screen.findByText(
        "Saved offline. It will be sent when the device is back online.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("Leo Brandt")).toBeInTheDocument();
  });

  it("keeps a confirmed removal when a later refresh fails", async () => {
    queryState.refetchError = true;
    renderPage(readyInvites);
    await openMenu("Leo Brandt");
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Remove access" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Remove access" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Leo Brandt's access was removed.",
    );
    await waitFor(() => {
      expect(queryState.fetches).toBeGreaterThan(1);
    });
    expect(screen.queryByText("Leo Brandt")).not.toBeInTheDocument();
    expect(
      screen.queryByText("The people list couldn't load."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });

  it("keeps the current search when a filtered member is removed", async () => {
    renderPage(readyInvites);
    const search = await screen.findByRole("searchbox", {
      name: "Search name or email",
    });
    fireEvent.change(search, { target: { value: "leo" } });
    await openMenu("Leo Brandt");
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Remove access" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Remove access" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Leo Brandt's access was removed.",
    );
    expect(search).toHaveValue("leo");
    expect(
      screen.getByText("No people match your search."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "People & invitations" }),
    ).toHaveFocus();
  });

  it("cancels an invite immediately and can toast the same action again", async () => {
    const canceled: string[] = [];
    queryState.hangRefetch = true;
    renderPage({
      resend: readyInvites.resend,
      cancel: ({ inviteId }) => {
        canceled.push(inviteId);
        return Promise.resolve({ ok: true });
      },
    });

    await openMenu("New invite");
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Cancel invite" }),
    );
    const first = await screen.findByRole("status");
    expect(first).toHaveTextContent("Invite canceled.");
    expect(first).toHaveAttribute("data-toast-id", "1");
    expect(screen.queryByText("New invite")).not.toBeInTheDocument();
    expect(canceled).toEqual(["invite-new"]);

    await openMenu("Old invite");
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Remove invite" }),
    );
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveAttribute("data-toast-id", "2");
    });
    expect(screen.getByRole("status")).toHaveTextContent("Invite canceled.");
    expect(canceled).toEqual(["invite-new", "invite-old"]);
  });

  it("shows a just-now label after resend and keeps the server timestamp", async () => {
    const sentAt = "2026-11-12T00:00:00.000Z";
    const client = renderPage({
      cancel: () => Promise.resolve({ ok: true }),
      resend: ({ inviteId }) => {
        queryState.people = queryState.people.map((person) =>
          person.id === inviteId
            ? {
                ...person,
                status: "pending",
                invitedAt: sentAt,
                expiresAt: "2026-11-19T00:00:00.000Z",
              }
            : person,
        );
        const person = queryState.people.find((row) => row.id === inviteId);
        if (!person) throw new Error("Expected resent row.");
        return Promise.resolve({ person });
      },
    });

    await openMenu("Old invite");
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Resend invite" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "New invite link sent.",
    );
    expect(screen.getByText("Invited just now")).toBeInTheDocument();
    expect(screen.queryByText("Invited Nov 12")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(
        client
          .getQueryData<Person[]>(["people", "list"])
          ?.find((person) => person.id === "invite-old")?.invitedAt,
      ).toBe(sentAt);
    });
    expect(
      screen.getByRole("button", { name: "More actions for Old invite" }),
    ).toHaveFocus();
  });

  it("reports resend rejection without changing the row", async () => {
    renderPage({
      cancel: () => Promise.resolve({ ok: true }),
      resend: () => Promise.reject(new Error("rejected")),
    });
    await openMenu("Old invite");
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Resend invite" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Couldn't resend the invite. Try again.",
    );
    expect(screen.getByText("Sent Sep 2 · link expired")).toBeInTheDocument();
  });

  it("reports a thrown cancel error", async () => {
    renderPage({
      resend: readyInvites.resend,
      cancel: () => Promise.reject(new Error("rejected")),
    });
    await openMenu("New invite");
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Cancel invite" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Couldn't cancel the invite. Try again.",
    );
    expect(screen.getByText("New invite")).toBeInTheDocument();
  });

  it("reconciles the list after an interrupted removal response", async () => {
    queryState.removeMode = "offline";
    renderPage();
    await openMenu("Leo Brandt");
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Remove access" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    queryState.people = queryState.people.filter(
      (person) => person.id !== "member-volunteer",
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Remove access" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't confirm the result",
    );
    await waitFor(() =>
      expect(screen.queryByText("Leo Brandt")).not.toBeInTheDocument(),
    );
  });
});

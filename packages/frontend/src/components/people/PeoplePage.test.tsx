import type { Person } from "@repo/common";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PeoplePage } from "@frontend/components/people/PeoplePage.tsx";

const queryState = vi.hoisted(() => ({
  people: [] as Person[],
  error: false,
  pending: false,
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
    people: {
      list: {
        queryOptions: () => ({
          queryKey: ["people", "list"],
          queryFn: () => {
            if (queryState.pending) return new Promise<Person[]>(() => {});
            if (queryState.error)
              return Promise.reject(new Error("load failed"));
            return Promise.resolve(queryState.people);
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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <PeoplePage />
    </QueryClientProvider>,
  );
}

afterEach(cleanup);

beforeEach(() => {
  queryState.people = rows;
  queryState.error = false;
  queryState.pending = false;
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
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SyncStatus } from "@frontend/components/SyncStatus.tsx";
import type {
  RejectedSyncItem,
  SyncMessage,
} from "@frontend/lib/offlineSync.ts";
import { AuthContext, DefaultAuthState } from "@frontend/lib/useAuth.ts";
import type { AuthState } from "@frontend/lib/useAuth.ts";

/** jsdom has no service workers. This stands in for the container. */
class FakeContainer extends EventTarget {
  controller = { postMessage: vi.fn<(message: unknown) => void>() };
  startMessages = vi.fn<() => void>();

  send(message: SyncMessage) {
    act(() => {
      this.dispatchEvent(new MessageEvent("message", { data: message }));
    });
  }
}

let container: FakeContainer;
let queryClient: QueryClient;

function tree(auth: AuthState) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <SyncStatus />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

function signedIn(uid: string): AuthState {
  return {
    isPending: false,
    isAuthed: true,
    user: { uid } as AuthState["user"],
  };
}

function renderStatus() {
  return render(tree(DefaultAuthState));
}

describe("SyncStatus", () => {
  beforeEach(() => {
    container = new FakeContainer();
    Object.defineProperty(navigator, "serviceWorker", {
      value: container,
      configurable: true,
    });
    queryClient = new QueryClient();
  });

  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(navigator, "serviceWorker");
  });

  it("asks for a replay on mount, which also reports the status", () => {
    renderStatus();

    expect(container.startMessages).toHaveBeenCalled();
    expect(container.controller.postMessage).toHaveBeenNthCalledWith(1, {
      type: "get-rejected-history",
    });
    expect(container.controller.postMessage).toHaveBeenNthCalledWith(2, {
      type: "replay-queue",
    });
  });

  it("shows how many writes are waiting", () => {
    renderStatus();
    expect(screen.queryByTestId("sync-pending")).not.toBeInTheDocument();

    container.send({ type: "sync-status", pending: 2 });
    expect(screen.getByTestId("sync-pending")).toHaveTextContent("2 changes");

    container.send({ type: "sync-status", pending: 0 });
    expect(screen.queryByTestId("sync-pending")).not.toBeInTheDocument();
  });

  it("refetches queries once queued writes land", () => {
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    renderStatus();

    container.send({ type: "sync-replayed", count: 1 });

    expect(invalidate).toHaveBeenCalledOnce();
  });

  it("shows refused writes until dismissed", () => {
    renderStatus();

    const item: RejectedSyncItem = {
      id: "r1",
      path: "notes.add",
      message: "Text is too long",
      createdAt: 1,
    };
    container.send({ type: "sync-rejected", item });
    expect(screen.getByTestId("sync-rejected")).toHaveTextContent(
      "Text is too long",
    );

    fireEvent.click(screen.getByText("Dismiss"));
    expect(container.controller.postMessage).toHaveBeenCalledWith({
      type: "dismiss-rejected",
      id: "r1",
    });
    expect(screen.queryByTestId("sync-rejected")).not.toBeInTheDocument();
  });

  it("loads remembered refused writes on mount", () => {
    renderStatus();

    container.send({
      type: "sync-rejected-history",
      items: [
        {
          id: "r1",
          path: "notes.add",
          message: "Text is too long",
          createdAt: 1,
        },
      ],
    });

    expect(screen.getByTestId("sync-rejected")).toHaveTextContent(
      "Text is too long",
    );
  });

  it("asks for a replay when someone signs in", () => {
    const { rerender } = renderStatus();
    container.controller.postMessage.mockClear();

    rerender(tree(signedIn("alice")));
    expect(container.controller.postMessage).toHaveBeenCalledOnce();

    rerender(tree(signedIn("alice")));
    expect(container.controller.postMessage).toHaveBeenCalledOnce();
  });

  it("asks for a replay when the page comes back online", () => {
    renderStatus();
    container.controller.postMessage.mockClear();

    window.dispatchEvent(new Event("online"));

    expect(container.controller.postMessage).toHaveBeenCalledWith({
      type: "replay-queue",
    });
  });

  it("renders nothing without service worker support", () => {
    Reflect.deleteProperty(navigator, "serviceWorker");
    renderStatus();

    expect(document.body).toHaveTextContent("");
  });
});

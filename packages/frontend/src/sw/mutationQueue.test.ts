// @vitest-environment node
import type { AppRouter } from "@repo/backend";
import { createTRPCClient, httpLink } from "@trpc/client";
import { describe, expect, it, vi } from "vitest";
import { isQueuedOffline } from "@frontend/lib/offlineSync.ts";
import type { SyncMessage } from "@frontend/lib/offlineSync.ts";
import {
  createReplayer,
  handleMutation,
  isMutationRequest,
  queuedResponse,
  replayQueue,
  uidFromAuthorization,
} from "@frontend/sw/mutationQueue.ts";
import type {
  MutationQueue,
  QueueUser,
  ReplayDeps,
} from "@frontend/sw/mutationQueue.ts";

const ORIGIN = "https://trees.example";

type Entry = Parameters<MutationQueue["pushRequest"]>[0];

/** In-memory stand-in for a Workbox Queue, which needs IndexedDB. */
class FakeQueue implements MutationQueue {
  entries: Entry[] = [];

  pushRequest(entry: Entry) {
    this.entries.push(copy(entry));
    return Promise.resolve();
  }
  unshiftRequest(entry: Entry) {
    this.entries.unshift(copy(entry));
    return Promise.resolve();
  }
  shiftRequest() {
    return Promise.resolve(this.entries.shift());
  }
  getAll() {
    return Promise.resolve(this.entries.map(copy));
  }
  size() {
    return Promise.resolve(this.entries.length);
  }
}

function copy(entry: Entry): Entry {
  return { ...entry, request: entry.request.clone() };
}

/** A Firebase-shaped ID token. Only the payload matters here. */
function idToken(uid: string) {
  const part = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "RS256" })}.${part({ sub: uid })}.signature`;
}

function mutation(path: string, input: unknown, uid?: string) {
  return new Request(`${ORIGIN}/api/trpc/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(uid ? { authorization: `Bearer ${idToken(uid)}` } : {}),
    },
    body: JSON.stringify(input),
  });
}

function user(uid: string): QueueUser {
  return {
    uid,
    getIdToken: () => Promise.resolve(`fresh-token-for-${uid}`),
  };
}

function offline(): Promise<Response> {
  return Promise.reject(new TypeError("Failed to fetch"));
}

function succeed(): Promise<Response> {
  return Promise.resolve(Response.json({ result: { data: null } }));
}

function trpcError(status: number, message: string) {
  return Response.json(
    { error: { message, code: -32600, data: { httpStatus: status } } },
    { status },
  );
}

function setup(overrides: Partial<ReplayDeps> = {}) {
  const queue = new FakeQueue();
  const messages: SyncMessage[] = [];
  const deps: ReplayDeps = {
    fetch: vi.fn<(request: Request) => Promise<Response>>(offline),
    notify: (message) => {
      messages.push(message);
      return Promise.resolve();
    },
    currentUser: () => Promise.resolve(user("alice")),
    ...overrides,
  };
  return { queue, messages, deps };
}

async function enqueue(queue: FakeQueue, request: Request) {
  await handleMutation(request, queue, {
    fetch: offline,
    notify: () => Promise.resolve(),
  });
}

describe("isMutationRequest", () => {
  const check = (url: string, method: string) =>
    isMutationRequest(new URL(url), new Request(url, { method }), ORIGIN);

  it("matches same-origin tRPC POSTs only", () => {
    expect(check(`${ORIGIN}/api/trpc/notes.add`, "POST")).toBe(true);
    expect(check(`${ORIGIN}/api/trpc/notes.list`, "GET")).toBe(false);
    expect(check(`${ORIGIN}/api/health`, "POST")).toBe(false);
    expect(check("https://elsewhere.example/api/trpc/x", "POST")).toBe(false);
  });
});

describe("handleMutation", () => {
  it("passes the server's response through when online", async () => {
    const { queue, deps } = setup({
      fetch: () => Promise.resolve(Response.json({ result: { data: "ok" } })),
    });

    const response = await handleMutation(
      mutation("notes.add", { text: "hi" }, "alice"),
      queue,
      deps,
    );

    expect(await response.json()).toEqual({ result: { data: "ok" } });
    expect(queue.entries).toHaveLength(0);
  });

  it("queues the write without its token when offline", async () => {
    const { queue, messages, deps } = setup();

    const response = await handleMutation(
      mutation("notes.add", { text: "hi" }, "alice"),
      queue,
      deps,
    );

    expect(response.status).toBe(202);
    expect(queue.entries).toHaveLength(1);
    const [entry] = queue.entries;
    expect(entry?.metadata).toEqual({ uid: "alice", path: "notes.add" });
    expect(entry?.request.headers.has("authorization")).toBe(false);
    expect(await entry?.request.json()).toEqual({ text: "hi" });
    expect(messages).toEqual([{ type: "sync-status", pending: 1 }]);
  });

  it("surfaces as a TRPCClientError that isQueuedOffline recognizes", async () => {
    const { queue, deps } = setup();
    const client = createTRPCClient<AppRouter>({
      links: [
        httpLink({
          url: `${ORIGIN}/api/trpc`,
          fetch: (input, init) =>
            handleMutation(new Request(input, init), queue, deps),
        }),
      ],
    });

    const error: unknown = await client.notes.add
      .mutate({ text: "hi" })
      .catch((error: unknown) => error);

    expect(isQueuedOffline(error)).toBe(true);
    expect(queue.entries).toHaveLength(1);
  });

  it("answers batched calls with one error per procedure", async () => {
    const response = queuedResponse(
      new URL(`${ORIGIN}/api/trpc/notes.add,notes.add?batch=1`),
    );
    const body: unknown = await response.json();

    expect(body).toHaveLength(2);
  });
});

describe("isQueuedOffline", () => {
  it("is false for ordinary failures", () => {
    expect(isQueuedOffline(new TypeError("Failed to fetch"))).toBe(false);
    expect(isQueuedOffline({ data: { code: "BAD_REQUEST" } })).toBe(false);
    expect(isQueuedOffline(null)).toBe(false);
  });
});

describe("replayQueue", () => {
  it("sends writes in order with a fresh token, then reports", async () => {
    const sent: { body: unknown; authorization: string | null }[] = [];
    const { queue, messages, deps } = setup({
      fetch: async (request) => {
        sent.push({
          body: await request.json(),
          authorization: request.headers.get("authorization"),
        });
        return Response.json({ result: { data: null } });
      },
    });
    await enqueue(queue, mutation("notes.add", { text: "one" }, "alice"));
    await enqueue(queue, mutation("notes.add", { text: "two" }, "alice"));

    await replayQueue(queue, deps);

    expect(sent).toEqual([
      { body: { text: "one" }, authorization: "Bearer fresh-token-for-alice" },
      { body: { text: "two" }, authorization: "Bearer fresh-token-for-alice" },
    ]);
    expect(queue.entries).toHaveLength(0);
    expect(messages).toEqual([
      { type: "sync-replayed", count: 2 },
      { type: "sync-status", pending: 0 },
    ]);
  });

  it("keeps the write at the front and throws while still offline", async () => {
    const { queue, deps } = setup();
    await enqueue(queue, mutation("notes.add", { text: "one" }, "alice"));
    await enqueue(queue, mutation("notes.add", { text: "two" }, "alice"));

    await expect(replayQueue(queue, deps)).rejects.toThrow("Failed to fetch");

    expect(queue.entries).toHaveLength(2);
    expect(await queue.entries[0]?.request.json()).toEqual({ text: "one" });
  });

  it("keeps the write when the token cannot be refreshed", async () => {
    const { queue, deps } = setup({
      currentUser: () =>
        Promise.resolve({
          uid: "alice",
          getIdToken: () =>
            Promise.reject(new Error("auth/network-request-failed")),
        }),
    });
    await enqueue(queue, mutation("notes.add", { text: "one" }, "alice"));

    await expect(replayQueue(queue, deps)).rejects.toThrow("auth/network");
    expect(queue.entries).toHaveLength(1);
  });

  it.each([401, 429, 500, 503])("retries later on HTTP %i", async (status) => {
    const { queue, deps } = setup({
      fetch: () => Promise.resolve(trpcError(status, "nope")),
    });
    await enqueue(queue, mutation("notes.add", { text: "one" }, "alice"));

    await expect(replayQueue(queue, deps)).rejects.toThrow(`HTTP ${status}`);
    expect(queue.entries).toHaveLength(1);
  });

  it("drops a write the server refuses and moves on", async () => {
    const { queue, messages, deps } = setup({
      fetch: async (request) => {
        const body = (await request.json()) as { text: string };
        return body.text === "bad"
          ? trpcError(400, "Text is too long")
          : succeed();
      },
    });
    await enqueue(queue, mutation("notes.add", { text: "bad" }, "alice"));
    await enqueue(queue, mutation("notes.add", { text: "good" }, "alice"));

    await replayQueue(queue, deps);

    expect(queue.entries).toHaveLength(0);
    expect(messages).toEqual([
      { type: "sync-rejected", path: "notes.add", message: "Text is too long" },
      { type: "sync-replayed", count: 1 },
      { type: "sync-status", pending: 0 },
    ]);
  });

  it.each([
    ["nobody is signed in", null],
    ["someone else is signed in", user("bob")],
  ])("waits, untouched, when %s", async (_, signedIn) => {
    const { queue, messages, deps } = setup({
      currentUser: () => Promise.resolve(signedIn),
    });
    await enqueue(queue, mutation("notes.add", { text: "one" }, "alice"));

    await replayQueue(queue, deps);

    expect(deps.fetch).not.toHaveBeenCalled();
    expect(queue.entries).toHaveLength(1);
    expect(messages).toEqual([{ type: "sync-status", pending: 1 }]);
  });

  it("sends writes made while signed out without a token", async () => {
    const { queue, deps } = setup({
      currentUser: () => Promise.resolve(null),
      fetch: vi.fn<(request: Request) => Promise<Response>>(succeed),
    });
    await enqueue(queue, mutation("hello.public", { name: "x" }));

    await replayQueue(queue, deps);

    const [[request]] = vi.mocked(deps.fetch).mock.calls as [[Request]];
    expect(request.headers.has("authorization")).toBe(false);
    expect(queue.entries).toHaveLength(0);
  });
});

describe("createReplayer", () => {
  /** Sessions a replayer opened, each reporting `signedIn` at that moment. */
  function sessions(signedIn: () => QueueUser | null) {
    const opened: { user: QueueUser | null; closed: boolean }[] = [];
    const openSession = () => {
      const session = { user: signedIn(), closed: false };
      opened.push(session);
      return Promise.resolve({
        user: session.user,
        close: () => {
          session.closed = true;
          return Promise.resolve();
        },
      });
    };
    return { opened, openSession };
  }

  it("shares one run between overlapping triggers", async () => {
    const { queue, deps } = setup({
      fetch: vi.fn<(request: Request) => Promise<Response>>(succeed),
    });
    const { opened, openSession } = sessions(() => user("alice"));
    await enqueue(queue, mutation("notes.add", { text: "one" }, "alice"));
    const replay = createReplayer({ ...deps, openSession });

    await Promise.all([replay(queue), replay(queue), replay(queue)]);

    expect(deps.fetch).toHaveBeenCalledOnce();
    expect(opened).toHaveLength(1);
  });

  it("reads who is signed in afresh on every run", async () => {
    let signedIn: QueueUser | null = user("alice");
    const { queue, deps } = setup({
      fetch: vi.fn<(request: Request) => Promise<Response>>(succeed),
    });
    const { opened, openSession } = sessions(() => signedIn);
    const replay = createReplayer({ ...deps, openSession });

    // Alice signs out in a page after the worker last looked.
    await enqueue(queue, mutation("notes.add", { text: "one" }, "alice"));
    signedIn = null;
    await replay(queue);
    expect(deps.fetch).not.toHaveBeenCalled();

    signedIn = user("alice");
    await replay(queue);
    expect(deps.fetch).toHaveBeenCalledOnce();

    expect(opened).toHaveLength(2);
    expect(opened.every((session) => session.closed)).toBe(true);
  });

  it("does not open a session when nothing needs a token", async () => {
    const { queue, deps } = setup();
    const { opened, openSession } = sessions(() => user("alice"));

    await createReplayer({ ...deps, openSession })(queue);

    expect(opened).toHaveLength(0);
  });

  it("closes the session when sending fails", async () => {
    const { queue, deps } = setup();
    const { opened, openSession } = sessions(() => user("alice"));
    await enqueue(queue, mutation("notes.add", { text: "one" }, "alice"));

    await expect(
      createReplayer({ ...deps, openSession })(queue),
    ).rejects.toThrow("Failed to fetch");

    expect(opened).toEqual([expect.objectContaining({ closed: true })]);
  });
});

describe("uidFromAuthorization", () => {
  it("reads the subject of a bearer token", () => {
    expect(uidFromAuthorization(`Bearer ${idToken("alice")}`)).toBe("alice");
  });

  it("returns null for anything else", () => {
    expect(uidFromAuthorization(null)).toBeNull();
    expect(uidFromAuthorization("Basic abc")).toBeNull();
    expect(uidFromAuthorization("Bearer not-a-jwt")).toBeNull();
    expect(uidFromAuthorization("Bearer a.%%%.c")).toBeNull();
  });
});

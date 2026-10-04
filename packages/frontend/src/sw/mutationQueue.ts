import type { Queue } from "workbox-background-sync";
import type { SyncMessage } from "@frontend/lib/offlineSync.ts";

/**
 * Queues tRPC mutations that fail because the device is offline, then sends
 * them again once it is back online.
 *
 * Workbox's stock `BackgroundSyncPlugin` replays each request exactly as it was
 * stored. That does not work here: the stored Firebase ID token expires after
 * an hour, and Workbox counts any HTTP response (even a 401) as delivered and
 * drops the write. So the token is stripped before storing, a fresh one is
 * attached at replay time, and only definite answers from the server remove a
 * write from the queue.
 *
 * Service worker APIs are passed in, so this module runs under Vitest.
 */

const TRPC_PREFIX = "/api/trpc/";

export type MutationQueue = Pick<
  Queue,
  "pushRequest" | "unshiftRequest" | "shiftRequest" | "getAll" | "size"
>;

/** Workbox does not export this type. */
type QueueEntry = Parameters<Queue["pushRequest"]>[0];

/** The signed-in user, from the service worker's own Firebase Auth instance. */
export interface QueueUser {
  uid: string;
  getIdToken(): Promise<string>;
}

export interface MutationQueueDeps {
  fetch: (request: Request) => Promise<Response>;
  notify: (message: SyncMessage) => Promise<void>;
}

export interface ReplayDeps extends MutationQueueDeps {
  currentUser: () => Promise<QueueUser | null>;
}

/** Who is signed in for one replay run. See src/sw/session.ts. */
export interface AuthSession {
  user: QueueUser | null;
  close(): Promise<void>;
}

export interface ReplayerDeps extends MutationQueueDeps {
  openSession: () => Promise<AuthSession>;
}

interface EntryMetadata {
  /** Who made the write. `null` for calls made while signed out. */
  uid: string | null;
  /** tRPC procedure path(s), for messages shown to the user. */
  path: string;
}

/** Same-origin tRPC calls sent with POST, which tRPC uses only for mutations. */
export function isMutationRequest(url: URL, request: Request, origin: string) {
  return (
    url.origin === origin &&
    url.pathname.startsWith(TRPC_PREFIX) &&
    request.method === "POST"
  );
}

/**
 * Sends a mutation. If the network is down, queues it and answers with a tRPC
 * error the page can recognize with `isQueuedOffline`.
 */
export async function handleMutation(
  request: Request,
  queue: MutationQueue,
  deps: MutationQueueDeps,
): Promise<Response> {
  // Sending consumes the body, and the queue needs its own copy.
  const backup = request.clone();
  try {
    return await deps.fetch(request);
  } catch {
    const url = new URL(request.url);
    const metadata: EntryMetadata = {
      uid: uidFromAuthorization(backup.headers.get("authorization")),
      path: procedurePath(url),
    };
    const stored = new Request(backup);
    stored.headers.delete("authorization");

    await queue.pushRequest({ request: stored, metadata: { ...metadata } });
    await deps.notify({ type: "sync-status", pending: await queue.size() });
    return queuedResponse(url);
  }
}

/**
 * Wraps `replayQueue` so overlapping triggers (a sync event, a page coming
 * back online, service worker startup) share one run instead of racing.
 * Each run reads who is signed in afresh, the first time it needs to.
 */
export function createReplayer({ openSession, ...deps }: ReplayerDeps) {
  let running: Promise<void> | null = null;

  async function run(queue: MutationQueue) {
    let session: Promise<AuthSession> | null = null;
    try {
      await replayQueue(queue, {
        ...deps,
        currentUser: async () => {
          const { user } = await (session ??= openSession());
          return user;
        },
      });
    } finally {
      running = null;
      if (session) await closeSession(session);
    }
  }

  return (queue: MutationQueue) => {
    running ??= run(queue);
    return running;
  };
}

/**
 * Sends queued writes oldest first. Throws when a write could not be sent, so
 * a Background Sync event fails and the browser retries it later.
 */
export async function replayQueue(
  queue: MutationQueue,
  deps: ReplayDeps,
): Promise<void> {
  let replayed = 0;
  try {
    for (;;) {
      // Peek first: taking a write out and putting it back would register a
      // new sync, and a write waiting for its owner would then loop forever.
      const [head] = await queue.getAll();
      if (!head) break;

      const { uid: owner, path } = readMetadata(head);
      const user = owner === null ? null : await deps.currentUser();
      // Stop at a write made by someone who is not signed in right now. It
      // stays at the front until they sign in again, so writes keep their
      // order, and nobody's write is ever sent with another user's token.
      if (owner !== null && user?.uid !== owner) break;

      const entry = await queue.shiftRequest();
      if (!entry) break;

      let response: Response;
      try {
        const request = new Request(entry.request.clone());
        if (user) {
          request.headers.set(
            "authorization",
            `Bearer ${await user.getIdToken()}`,
          );
        }
        response = await deps.fetch(request);
      } catch (error) {
        await queue.unshiftRequest(entry);
        throw error;
      }

      if (response.ok) {
        replayed += 1;
      } else if (isRetryable(response.status)) {
        await queue.unshiftRequest(entry);
        throw new Error(
          `Replaying ${path} failed with HTTP ${response.status}. Retrying later.`,
        );
      } else {
        await deps.notify({
          type: "sync-rejected",
          path,
          message: await errorMessage(response),
        });
      }
    }
  } finally {
    if (replayed > 0) {
      await deps.notify({ type: "sync-replayed", count: replayed });
    }
    await deps.notify({ type: "sync-status", pending: await queue.size() });
  }
}

/**
 * The tRPC error shape, with `data.queuedOffline` set. `httpLink` turns this
 * into a `TRPCClientError`; batched calls get one error per procedure.
 */
export function queuedResponse(url: URL): Response {
  const path = procedurePath(url);
  const error = {
    error: {
      message: "Saved offline. It will be sent when the device is back online.",
      code: -32603,
      data: {
        code: "SERVICE_UNAVAILABLE",
        httpStatus: 202,
        path,
        queuedOffline: true,
      },
    },
  };
  const body =
    url.searchParams.get("batch") === "1"
      ? path.split(",").map(() => error)
      : error;

  return new Response(JSON.stringify(body), {
    status: 202,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Reads the uid from a Firebase ID token without verifying it. That is fine
 * here: it only decides whose session a queued write waits for, and the server
 * verifies the fresh token sent with the replay.
 */
export function uidFromAuthorization(header: string | null): string | null {
  const payload = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length).split(".")[1]
    : undefined;
  if (!payload) return null;

  try {
    const claims: unknown = JSON.parse(
      atob(payload.replaceAll("-", "+").replaceAll("_", "/")),
    );
    return typeof claims === "object" &&
      claims !== null &&
      "sub" in claims &&
      typeof claims.sub === "string"
      ? claims.sub
      : null;
  } catch {
    return null;
  }
}

async function closeSession(session: Promise<AuthSession>) {
  try {
    const { close } = await session;
    await close();
  } catch {
    // Opening it failed, and replayQueue already rethrew that.
  }
}

/** Offline, rate limited, or a server/auth hiccup: worth trying again. */
function isRetryable(status: number) {
  return status === 401 || status === 408 || status === 429 || status >= 500;
}

function procedurePath(url: URL) {
  return decodeURIComponent(url.pathname.slice(TRPC_PREFIX.length));
}

function readMetadata(entry: QueueEntry): EntryMetadata {
  const metadata: Partial<EntryMetadata> = entry.metadata ?? {};
  return {
    uid: typeof metadata.uid === "string" ? metadata.uid : null,
    path: typeof metadata.path === "string" ? metadata.path : "unknown",
  };
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    const first: unknown = Array.isArray(body) ? body[0] : body;
    if (
      typeof first === "object" &&
      first !== null &&
      "error" in first &&
      typeof first.error === "object" &&
      first.error !== null &&
      "message" in first.error &&
      typeof first.error.message === "string"
    ) {
      return first.error.message;
    }
  } catch {
    // Not JSON. Fall through to the status code.
  }
  return `The server refused the change (HTTP ${response.status}).`;
}

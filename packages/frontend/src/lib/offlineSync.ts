/**
 * Contract between the page and the service worker for writes made offline.
 * See `src/sw/mutationQueue.ts` for the service worker side. The service
 * worker bundles this file too, so keep it free of DOM and React code.
 */

/** Workbox Background Sync queue that holds tRPC mutations made offline. */
export const MUTATION_QUEUE_NAME = "trpc-mutations";

/** Messages the service worker posts to every open page. */
export type SyncMessage =
  /** How many writes are still waiting to be sent. */
  | { type: "sync-status"; pending: number }
  /** Queued writes reached the server, so cached query data is stale. */
  | { type: "sync-replayed"; count: number }
  /** The server refused a queued write. Retrying cannot fix it, so it was dropped. */
  | { type: "sync-rejected"; path: string; message: string };

/** Messages a page posts to the service worker. */
export interface SyncCommand {
  /**
   * Try sending queued writes now. Always answered with `sync-status`, so a
   * page also sends this on load to learn how many are waiting.
   */
  type: "replay-queue";
}

/**
 * True when a mutation failed only because the device is offline and the
 * service worker queued it for later. Forms should treat this as saved.
 */
export function isQueuedOffline(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return false;
  }
  const { data } = error;
  return (
    typeof data === "object" &&
    data !== null &&
    "queuedOffline" in data &&
    data.queuedOffline === true
  );
}

/**
 * Contract between the page and the service worker for writes made offline.
 * See `src/sw/mutationQueue.ts` for the service worker side. The service
 * worker bundles this file too, so keep it free of DOM and React code.
 */

/** Workbox Background Sync queue that holds tRPC mutations made offline. */
export const MUTATION_QUEUE_NAME = "trpc-mutations";

/** A queued offline write the server permanently refused. */
export interface RejectedSyncItem {
  id: string;
  path: string;
  message: string;
  createdAt: number;
}

/** Messages the service worker posts to every open page. */
export type SyncMessage =
  /** How many writes are still waiting to be sent. */
  | { type: "sync-status"; pending: number }
  /** Queued writes reached the server, so cached query data is stale. */
  | { type: "sync-replayed"; count: number }
  /** The server refused a queued write. Retrying cannot fix it, so it was dropped. */
  | { type: "sync-rejected"; item: RejectedSyncItem }
  /** Rejected writes remembered by the service worker for later display. */
  | { type: "sync-rejected-history"; items: RejectedSyncItem[] };

/** Messages a page posts to the service worker. */
export type SyncCommand =
  | {
      /**
       * Try sending queued writes now. Always answered with `sync-status`, so a
       * page also sends this on load to learn how many are waiting.
       */
      type: "replay-queue";
    }
  | {
      /** Ask the service worker for remembered rejected writes. */
      type: "get-rejected-history";
    }
  | {
      /** Forget one remembered rejected write after the user dismisses it. */
      type: "dismiss-rejected";
      id: string;
    };

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

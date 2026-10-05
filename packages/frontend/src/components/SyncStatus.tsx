import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type {
  RejectedSyncItem,
  SyncCommand,
  SyncMessage,
} from "@frontend/lib/offlineSync.ts";
import { useAuth } from "@frontend/lib/useAuth.ts";

/**
 * Shows writes made offline that are waiting to be sent, and any the server
 * refused when they were. Also nudges the service worker to send them on load,
 * when the page comes back online, and when someone signs in (their writes
 * wait for them): browsers without Background Sync (Safari, Firefox)
 * otherwise only retry when the service worker starts up.
 */
export function SyncStatus() {
  const queryClient = useQueryClient();
  const uid = useAuth().user?.uid;
  const [pending, setPending] = useState(0);
  const [rejected, setRejected] = useState<RejectedSyncItem[]>([]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const container = navigator.serviceWorker;

    const onMessage = (event: MessageEvent<SyncMessage | null>) => {
      const message = event.data;
      switch (message?.type) {
        case "sync-status":
          setPending(message.pending);
          break;
        case "sync-replayed":
          // Lists on screen were fetched before these writes landed.
          void queryClient.invalidateQueries();
          break;
        case "sync-rejected":
          setRejected((current) => appendRejected(current, message.item));
          break;
        case "sync-rejected-history":
          setRejected((current) => mergeRejected(current, message.items));
          break;
      }
    };

    container.addEventListener("message", onMessage);
    container.startMessages();
    requestRejectedHistory();
    window.addEventListener("online", requestReplay);

    return () => {
      container.removeEventListener("message", onMessage);
      window.removeEventListener("online", requestReplay);
    };
  }, [queryClient]);

  // On load, and whenever a different user signs in.
  useEffect(() => {
    requestReplay();
  }, [uid]);

  if (pending === 0 && rejected.length === 0) return null;

  return (
    <div className="mb-6 space-y-2 text-sm" aria-live="polite">
      {pending > 0 && (
        <p
          data-testid="sync-pending"
          className="rounded-md border border-slate-200 px-3 py-2 text-slate-600 dark:border-slate-800 dark:text-slate-300"
        >
          {pending === 1 ? "1 change" : `${pending} changes`} saved offline.
          They will be sent when you&apos;re back online.
        </p>
      )}
      {rejected.map((item) => (
        <div
          key={item.id}
          data-testid="sync-rejected"
          className="flex items-start gap-3 rounded-md border border-red-300 px-3 py-2 text-red-700 dark:border-red-900 dark:text-red-300"
        >
          <p className="mr-auto">
            A change saved offline could not be applied ({item.path}):{" "}
            {item.message}
          </p>
          <button
            type="button"
            onClick={() => dismissRejected(item.id, setRejected)}
            className="shrink-0 underline"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}

/** Answered with `sync-status`, so this also reports how many are waiting. */
function requestReplay() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.controller?.postMessage({
    type: "replay-queue",
  } satisfies SyncCommand);
}

function requestRejectedHistory() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.controller?.postMessage({
    type: "get-rejected-history",
  } satisfies SyncCommand);
}

function dismissRejected(
  id: string,
  setRejected: Dispatch<SetStateAction<RejectedSyncItem[]>>,
) {
  setRejected((current) => current.filter((item) => item.id !== id));
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.controller?.postMessage({
    type: "dismiss-rejected",
    id,
  } satisfies SyncCommand);
}

function appendRejected(current: RejectedSyncItem[], item: RejectedSyncItem) {
  if (current.some((existing) => existing.id === item.id)) return current;
  return sortRejected([...current, item]);
}

function mergeRejected(current: RejectedSyncItem[], items: RejectedSyncItem[]) {
  return sortRejected(items.reduce(appendRejected, current));
}

function sortRejected(items: RejectedSyncItem[]) {
  return [...items].sort((left, right) => left.createdAt - right.createdAt);
}

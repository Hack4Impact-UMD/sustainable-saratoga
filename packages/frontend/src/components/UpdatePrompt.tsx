import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Registers the service worker and, when a new version has been deployed,
 * asks before reloading. Reloading on its own would wipe any form a volunteer
 * is in the middle of filling out, so the update waits until they accept.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div
      aria-live="polite"
      data-testid="update-prompt"
      className="type-body-sm fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md flex-wrap items-center gap-3 rounded-lg border border-line-subtle bg-surface p-4 shadow-2"
    >
      <p className="mr-auto">
        A new version is available. Save your work, then reload.
      </p>
      <button
        type="button"
        onClick={() => setNeedRefresh(false)}
        className="type-control rounded-md px-3 py-1.5 text-body-muted hover:bg-hover"
      >
        Later
      </button>
      <button
        type="button"
        data-testid="update-reload"
        onClick={() => void updateServiceWorker()}
        className="type-control rounded-md border border-line-strong px-3 py-1.5 hover:bg-hover"
      >
        Reload
      </button>
    </div>
  );
}

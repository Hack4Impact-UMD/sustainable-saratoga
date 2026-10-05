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
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-lg dark:border-slate-800 dark:bg-slate-900"
    >
      <p className="mr-auto">
        A new version is available. Save your work, then reload.
      </p>
      <button
        type="button"
        onClick={() => setNeedRefresh(false)}
        className="rounded-md px-3 py-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        Later
      </button>
      <button
        type="button"
        data-testid="update-reload"
        onClick={() => void updateServiceWorker()}
        className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        Reload
      </button>
    </div>
  );
}

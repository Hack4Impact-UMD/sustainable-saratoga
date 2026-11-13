import { Dialog } from "@base-ui/react/dialog";
import { AlertCircle, UserMinus } from "lucide-react";
import { useRef } from "react";
import { Button } from "@frontend/components/ui/button.tsx";

export type RemoveDialogError = "offline" | "unknown" | "queued" | "failed";

/**
 * Confirmation for removing a member. Scrim and Escape dismiss before
 * submission. While the request is in flight those dismissals are ignored
 * and the confirm button stays focusable.
 */
export function RemoveAccessDialog({
  name,
  open,
  pending,
  error,
  onDismiss,
  onConfirm,
  finalFocus,
}: {
  name: string;
  open: boolean;
  pending: boolean;
  error: RemoveDialogError | null;
  onDismiss: () => void;
  onConfirm: () => void;
  finalFocus: () => HTMLElement | boolean | null;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog.Root
      open={open}
      disablePointerDismissal={pending}
      onOpenChange={(nextOpen) => {
        if (nextOpen || pending) return;
        onDismiss();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-scrim" />
        <Dialog.Popup
          initialFocus={() => confirmRef.current ?? true}
          finalFocus={finalFocus}
          render={<div role="alertdialog" />}
          className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-md bg-surface p-4 shadow-2 outline-none"
        >
          <Dialog.Title className="type-h3 text-heading">
            Remove {name}&apos;s access?
          </Dialog.Title>
          <Dialog.Description className="type-body mt-2 text-body">
            They won&apos;t be able to sign in to Tree Tracker. Their tree
            records, edits and photos stay and remain credited to them.
          </Dialog.Description>
          {error && (
            <p role="alert" className="mt-3 flex items-start gap-2 text-error">
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0"
              />
              <span className="type-body">{removeErrorCopy(error)}</span>
            </p>
          )}
          <div className="mt-4 flex flex-col gap-2">
            <Button
              ref={confirmRef}
              type="button"
              aria-disabled={pending}
              aria-busy={pending}
              className="h-11 w-full bg-error text-on-primary hover:bg-error"
              onClick={() => {
                if (pending) return;
                onConfirm();
              }}
            >
              <UserMinus aria-hidden="true" className="size-4" />
              {pending ? "Removing…" : "Remove access"}
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-disabled={pending}
              className="h-11 w-full"
              onClick={() => {
                if (pending) return;
                onDismiss();
              }}
            >
              Cancel
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function removeErrorCopy(error: RemoveDialogError) {
  if (error === "offline") return "You're offline. Nothing was changed.";
  if (error === "unknown")
    return "Couldn't confirm the result. Check the refreshed list.";
  if (error === "queued") {
    return "Saved offline. It will be sent when the device is back online.";
  }
  return "Couldn't finish removing access. Try again.";
}

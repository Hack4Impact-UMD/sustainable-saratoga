import { Menu } from "@base-ui/react/menu";
import { MoreVertical, Send, UserMinus, X } from "lucide-react";
import type { Person } from "@repo/common";

export type PersonMenuAction = "remove" | "resend" | "cancel";

const itemClass =
  "flex h-12 w-full cursor-pointer items-center gap-2 px-3 text-left type-body outline-none data-highlighted:bg-hover data-disabled:cursor-not-allowed data-disabled:opacity-50";
const dangerItemClass = `${itemClass} text-error data-highlighted:bg-error-tint`;

/**
 * Row menu for one person. The chosen action runs after the menu finishes
 * closing so its focus return does not fight the dialog that may open next.
 */
export function PersonActionsMenu({
  person,
  disabled,
  triggerRef,
  onAction,
}: {
  person: Person;
  disabled: boolean;
  triggerRef: (node: HTMLButtonElement | null) => void;
  onAction: (action: PersonMenuAction) => void;
}) {
  const displayName = person.name || person.email;
  const cancelLabel =
    person.status === "expired" ? "Remove invite" : "Cancel invite";

  function choose(action: PersonMenuAction) {
    // Let the menu return focus to the trigger before a dialog takes it.
    window.setTimeout(() => onAction(action), 0);
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={`More actions for ${displayName}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-pill text-icon-primary hover:bg-hover aria-expanded:bg-selected focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <MoreVertical aria-hidden="true" className="size-5" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="end"
          sideOffset={4}
          collisionAvoidance={{
            side: "flip",
            align: "shift",
            fallbackAxisSide: "end",
          }}
          className="z-50"
        >
          <Menu.Popup className="min-w-48 rounded-md border border-line bg-surface py-1 shadow-2 outline-none">
            {person.status === "active" ? (
              <Menu.Item
                className={dangerItemClass}
                onClick={() => choose("remove")}
              >
                <UserMinus aria-hidden="true" className="size-5" />
                Remove access
              </Menu.Item>
            ) : (
              <>
                <Menu.Item
                  className={itemClass}
                  onClick={() => choose("resend")}
                >
                  <Send aria-hidden="true" className="size-5" />
                  Resend invite
                </Menu.Item>
                <Menu.Item
                  className={dangerItemClass}
                  onClick={() => choose("cancel")}
                >
                  <X aria-hidden="true" className="size-5" />
                  {cancelLabel}
                </Menu.Item>
              </>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

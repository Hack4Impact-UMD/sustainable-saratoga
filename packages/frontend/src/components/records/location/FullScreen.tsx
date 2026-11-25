import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/** Full-screen layer for the address search and place-pin screens. */
export function FullScreen({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 flex flex-col bg-surface font-sans"
    >
      {children}
    </div>,
    document.body,
  );
}
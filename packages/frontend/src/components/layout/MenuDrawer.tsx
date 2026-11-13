import { useQuery } from "@tanstack/react-query";
import {
  LogOut,
  Map,
  PanelLeftClose,
  Settings,
  Settings2,
  UserRound,
  Users,
} from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@frontend/lib/useAuth.ts";
import { trpc } from "@frontend/lib/trpc.ts";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@frontend/components/ui/sheet.tsx";

interface MenuDrawerProps {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
  signOutPending: boolean;
}

export function MenuDrawer({
  open,
  onClose,
  onSignOut,
  signOutPending,
}: MenuDrawerProps) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const { data, isError } = useQuery(trpc.users.me.queryOptions());
  const profile = data?.profile;
  const recordsSelected = pathname === "/" || pathname.startsWith("/records/");
  const peopleSelected = pathname === "/people";
  const fullName = profile
    ? `${profile.firstName} ${profile.lastName}`
    : user?.displayName || user?.email?.split("@")[0] || "Account";
  const initials = fullName
    .split(/\s+/)
    .map((part) => part[0])
    .filter((initial): initial is string => initial !== undefined)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const roleLabel = isError
    ? "Profile unavailable"
    : profile?.role === "admin"
      ? "Admin"
      : profile?.role === "volunteer"
        ? "Volunteer"
        : null;

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-79 gap-0 overflow-y-auto border-r border-line-subtle bg-surface p-0 text-body shadow-2"
      >
        <header className="flex min-h-24 items-center gap-3 border-b border-line-subtle px-4 py-4">
          <SheetTitle className="sr-only">User Menu</SheetTitle>
          <div
            aria-hidden="true"
            className={`grid size-10 shrink-0 place-items-center rounded-full ${
              profile?.role === "admin"
                ? "bg-hover text-icon-secondary"
                : "bg-secondary text-on-primary"
            }`}
          >
            {profile?.role === "admin" ? (
              <UserRound className="size-6" />
            ) : (
              <span className="type-body-sm text-on-primary font-bold">
                {initials}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="type-h1 truncate">{fullName}</p>
            {roleLabel && (
              <p className="type-badge text-primary">{roleLabel}</p>
            )}
          </div>
          <SheetClose
            render={
              <button
                type="button"
                aria-label="Close menu"
                className="size-11 place-items-center rounded-pill text-icon-secondary hover:bg-hover"
              >
                <PanelLeftClose aria-hidden="true" className="size-5" />
              </button>
            }
          />
        </header>

        <nav aria-label="Main menu" className="flex-1 pt-4 px-3 pb-2">
          <Link
            to="/"
            onClick={onClose}
            aria-current={recordsSelected ? "page" : undefined}
            className={`flex h-12 w-full items-center gap-3 rounded-md p-4 ${
              recordsSelected
                ? "type-btn-primary bg-selected text-primary"
                : "type-btn-secondary text-body hover:bg-hover"
            }`}
          >
            <Map
              aria-hidden="true"
              className="size-5 shrink-0 text-icon-primary"
            />
            Records
          </Link>

          {profile?.role === "admin" && (
            <section aria-labelledby="administration-heading">
              <h2
                id="administration-heading"
                className="px-4 pt-4 pb-1 font-bold text-[13px] leading-4.5 tracking-[0.04875rem] text-body-muted"
              >
                ADMINISTRATION
              </h2>
              <div className="space-y-1">
                <Link
                  to="/people"
                  onClick={onClose}
                  aria-current={peopleSelected ? "page" : undefined}
                  className={`flex h-12 w-full items-center gap-3 rounded-md p-4 ${
                    peopleSelected
                      ? "type-btn-primary bg-selected text-body"
                      : "type-btn-secondary text-body hover:bg-hover"
                  }`}
                >
                  <Users
                    aria-hidden="true"
                    className="size-5 shrink-0 text-icon-primary"
                  />
                  People &amp; invitations
                </Link>
                <button
                  type="button"
                  disabled // Disable the button for now, as the feature is not implemented yet
                  className="type-btn-secondary flex h-12 w-full cursor-not-allowed items-center gap-3 rounded-md px-3 text-left text-body-muted"
                >
                  <Settings2 aria-hidden="true" className="size-5 shrink-0" />
                  Manage fields
                </button>
              </div>
            </section>
          )}
        </nav>

        <footer className="shrink-0 space-y-1 border-t border-divider p-3 text-body">
          <button
            type="button"
            disabled // Disable the button for now, as the feature is not implemented yet
            className="type-btn-secondary flex h-11 w-full cursor-not-allowed items-center gap-3 rounded-md px-3 text-left text-body"
          >
            <Settings aria-hidden="true" className="size-5 shrink-0" />
            Account settings
          </button>
          <button
            type="button"
            onClick={onSignOut}
            disabled={signOutPending}
            className="type-btn-secondary flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-body hover:bg-hover disabled:cursor-not-allowed disabled:text-disabled"
          >
            <LogOut
              aria-hidden="true"
              className="size-5 shrink-0 text-icon-primary"
            />
            Sign out
          </button>
        </footer>
      </SheetContent>
    </Sheet>
  );
}

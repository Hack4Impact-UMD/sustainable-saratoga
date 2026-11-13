import type { Person } from "@repo/common";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertCircle, ChevronLeft, Clock3 } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PersonActionsMenu } from "@frontend/components/people/PersonActionsMenu.tsx";
import type { PersonMenuAction } from "@frontend/components/people/PersonActionsMenu.tsx";
import { RemoveAccessDialog } from "@frontend/components/people/RemoveAccessDialog.tsx";
import type { RemoveDialogError } from "@frontend/components/people/RemoveAccessDialog.tsx";
import {
  classifyRowFailure,
  nextActionableId,
  withoutPerson,
} from "@frontend/components/people/inviteMutations.ts";
import { PeopleSearchInput } from "@frontend/components/ui/PeopleSearchInput.tsx";
import { Toast } from "@frontend/components/ui/Toast.tsx";
import { trpc } from "@frontend/lib/trpc.ts";

const inviteDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const emptyPeople: Person[] = [];
const JUST_INVITED_MS = 4000;

type ToastState = {
  id: number;
  message: string;
  variant: "success" | "error";
};

type RemoveTarget = { uid: string; name: string };
type FocusRequest = string | "list" | "title";

/**
 * Displays the admin's people list. The API supplies the invite-first ordering;
 * this component only filters those rows for the local search field.
 */
export function PeoplePage() {
  const [search, setSearch] = useState("");
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null);
  const [removeError, setRemoveError] = useState<RemoveDialogError | null>(
    null,
  );
  const [removePending, setRemovePending] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [justInvitedId, setJustInvitedId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const triggers = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<FocusRequest | null>(null);
  const skipDialogRestore = useRef(false);
  const [dialogCopy, setDialogCopy] = useState<RemoveTarget | null>(null);
  const inFlight = useRef(false);
  const toastId = useRef(0);
  const queryClient = useQueryClient();
  const peopleQuery = useQuery(trpc.people.list.queryOptions());
  const removeAccess = useMutation(
    trpc.people.removeAccess.mutationOptions({ networkMode: "always" }),
  );
  const resendInvite = useMutation(
    trpc.invites.resend.mutationOptions({ networkMode: "always" }),
  );
  const cancelInvite = useMutation(
    trpc.invites.cancel.mutationOptions({ networkMode: "always" }),
  );
  const allPeople = peopleQuery.data ?? emptyPeople;
  const normalizedSearch = search.trim().toLowerCase();
  const people = useMemo(
    () =>
      allPeople.filter(
        (person) =>
          person.name.toLowerCase().includes(normalizedSearch) ||
          person.email.toLowerCase().includes(normalizedSearch),
      ),
    [allPeople, normalizedSearch],
  );
  const memberCount = allPeople.filter(
    (person) => person.status === "active",
  ).length;
  const inviteCount = allPeople.length - memberCount;
  const matchingPeopleCount = people.length;
  const listKey = trpc.people.list.queryKey();

  useEffect(() => {
    if (!peopleQuery.isPending) {
      titleRef.current?.focus();
    }
  }, [peopleQuery.isPending]);

  useEffect(() => {
    if (!justInvitedId) return;
    const timeout = window.setTimeout(
      () => setJustInvitedId(null),
      JUST_INVITED_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [justInvitedId]);

  useLayoutEffect(() => {
    const request = pendingFocus.current;
    if (!request) return;
    pendingFocus.current = null;
    if (request === "title") titleRef.current?.focus();
    else if (request === "list") listRef.current?.focus();
    else
      (
        triggers.current.get(request) ??
        listRef.current ??
        titleRef.current
      )?.focus();
  });

  function showToast(variant: ToastState["variant"], message: string) {
    toastId.current += 1;
    setToast({ id: toastId.current, variant, message });
  }

  function focusAfterRemoval(visible: Person[], removedId: string) {
    const nextId = nextActionableId(visible, removedId);
    const remaining = withoutPerson(visible, removedId);
    pendingFocus.current = nextId
      ? nextId
      : remaining.length > 0
        ? "list"
        : "title";
  }

  async function dropRow(id: string) {
    await queryClient.cancelQueries({ queryKey: listKey });
    queryClient.setQueryData<Person[]>(listKey, (current) =>
      withoutPerson(current ?? [], id),
    );
    void queryClient.invalidateQueries({ queryKey: listKey });
  }

  async function confirmRemove() {
    if (!removeTarget || inFlight.current) return;
    inFlight.current = true;
    if (navigator.onLine === false) {
      inFlight.current = false;
      setRemoveError("offline");
      return;
    }
    const target = removeTarget;
    const visible = people;
    setRemovePending(true);
    setRemoveError(null);
    try {
      await removeAccess.mutateAsync({ uid: target.uid });
      await dropRow(target.uid);
      focusAfterRemoval(visible, target.uid);
      skipDialogRestore.current = true;
      setRemoveTarget(null);
      showToast("success", `${target.name}'s access was removed.`);
    } catch (error) {
      const failure = classifyRowFailure(error);
      setRemoveError(failure === "server" ? "failed" : failure);
      if (failure !== "queued") {
        void queryClient.invalidateQueries({ queryKey: listKey });
      }
    } finally {
      inFlight.current = false;
      setRemovePending(false);
    }
  }

  async function runInviteAction(
    action: Exclude<PersonMenuAction, "remove">,
    person: Person,
  ) {
    if (inFlight.current) return;
    inFlight.current = true;
    if (navigator.onLine === false) {
      inFlight.current = false;
      showToast("error", "You're offline. Nothing was changed.");
      return;
    }
    setActionPending(true);
    try {
      if (action === "cancel") {
        await cancelInvite.mutateAsync({ inviteId: person.id });
        await dropRow(person.id);
        focusAfterRemoval(people, person.id);
        showToast("success", "Invite canceled.");
        return;
      }
      const { person: updated } = await resendInvite.mutateAsync({
        inviteId: person.id,
      });
      await queryClient.cancelQueries({ queryKey: listKey });
      queryClient.setQueryData<Person[]>(listKey, (current) => {
        if (
          !current?.some(
            (row) => row.id === updated.id && row.status !== "active",
          )
        )
          return current;
        return [updated, ...withoutPerson(current, updated.id)];
      });
      setJustInvitedId(person.id);
      pendingFocus.current = person.id;
      showToast("success", "New invite link sent.");
      void queryClient.invalidateQueries({ queryKey: listKey });
    } catch (error) {
      const failure = classifyRowFailure(error);
      if (failure === "queued") {
        showToast(
          "error",
          "Saved offline. It will be sent when the device is back online.",
        );
      } else if (failure === "unknown") {
        showToast(
          "error",
          "Couldn't confirm the result. Check the refreshed list.",
        );
        void queryClient.invalidateQueries({ queryKey: listKey });
      } else if (action === "cancel") {
        showToast("error", "Couldn't cancel the invite. Try again.");
        void queryClient.invalidateQueries({ queryKey: listKey });
      } else {
        showToast("error", "Couldn't resend the invite. Try again.");
        void queryClient.invalidateQueries({ queryKey: listKey });
      }
    } finally {
      inFlight.current = false;
      setActionPending(false);
    }
  }

  function onRowAction(person: Person, action: PersonMenuAction) {
    if (action === "remove") {
      setRemoveError(null);
      const target = { uid: person.id, name: person.name || person.email };
      setDialogCopy(target);
      setRemoveTarget(target);
      return;
    }
    void runInviteAction(action, person);
  }

  if (peopleQuery.isPending) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-md bg-surface">
        <output className="type-body block p-4 text-body">
          Loading people...
        </output>
      </main>
    );
  }

  if (peopleQuery.isError && peopleQuery.data === undefined) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-md bg-surface">
        <div className="flex items-start gap-2 p-4 text-error">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p role="alert" className="type-body">
            The people list couldn&apos;t load.
          </p>
          <button
            type="button"
            className="type-link min-h-11 min-w-11 shrink-0"
            onClick={() => void peopleQuery.refetch()}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const busy = removePending || actionPending;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md bg-surface">
      <header className="border-b border-divider">
        <div className="flex h-14 items-center gap-2 px-1">
          <Link
            to="/"
            aria-label="Back to records"
            className="grid size-11 shrink-0 place-items-center rounded-pill text-icon-primary hover:bg-hover"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Link>
          <h1
            ref={titleRef}
            tabIndex={-1}
            className="type-h2 overflow-hidden text-ellipsis"
          >
            People &amp; invitations
          </h1>
        </div>
      </header>

      <div className="px-4">
        <label htmlFor="people-search" className="mt-3 mb-2 block">
          <PeopleSearchInput
            id="people-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch("")}
            placeholder="Search name or email"
            aria-label="Search name or email"
          />
        </label>

        <p
          aria-live="polite"
          className="type-caption mt-1 mb-2 text-body-muted"
        >
          {normalizedSearch ? (
            <>
              Showing{" "}
              <strong className="font-bold text-heading">
                {matchingPeopleCount}
              </strong>{" "}
              results
            </>
          ) : (
            <>
              <strong className="font-bold text-heading">
                {formatCount(memberCount, "member")}
              </strong>
              {inviteCount > 0 && <> · {formatCount(inviteCount, "invite")}</>}
            </>
          )}
        </p>
        {peopleQuery.isError && (
          <div className="mb-2 flex items-center gap-2 text-error">
            <AlertCircle aria-hidden="true" className="size-5 shrink-0" />
            <p role="alert" className="type-body">
              The people list couldn&apos;t refresh.
            </p>
            <button
              type="button"
              className="type-link min-h-11 min-w-11"
              onClick={() => void peopleQuery.refetch()}
            >
              Refresh
            </button>
          </div>
        )}
      </div>

      {people.length > 0 ? (
        <ul
          ref={listRef}
          tabIndex={-1}
          aria-label="People and invitations"
          className="divide-y divide-divider outline-none"
        >
          {people.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              justInvited={person.id === justInvitedId}
              menuDisabled={busy}
              triggerRef={(node) => {
                if (node) triggers.current.set(person.id, node);
                else triggers.current.delete(person.id);
              }}
              onAction={(action) => onRowAction(person, action)}
            />
          ))}
        </ul>
      ) : (
        <p className="type-body p-4 text-body-muted">
          No people match your search.
        </p>
      )}

      <RemoveAccessDialog
        name={dialogCopy?.name ?? ""}
        open={removeTarget !== null}
        pending={removePending}
        error={removeError}
        onDismiss={() => {
          if (removePending) return;
          setRemoveTarget(null);
          setRemoveError(null);
        }}
        onConfirm={() => void confirmRemove()}
        finalFocus={() => {
          if (skipDialogRestore.current) {
            skipDialogRestore.current = false;
            return false;
          }
          const uid = dialogCopy?.uid;
          return (
            (uid && triggers.current.get(uid)) ||
            listRef.current ||
            titleRef.current
          );
        }}
      />

      {toast && (
        <Toast
          key={toast.id}
          data-toast-id={toast.id}
          variant={toast.variant}
          message={toast.message}
          className="w-auto"
        />
      )}
    </main>
  );
}

function formatCount(count: number, singular: string) {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

function PersonRow({
  person,
  justInvited,
  menuDisabled,
  triggerRef,
  onAction,
}: {
  person: Person;
  justInvited: boolean;
  menuDisabled: boolean;
  triggerRef: (node: HTMLButtonElement | null) => void;
  onAction: (action: PersonMenuAction) => void;
}) {
  const displayName = person.name || person.email;
  const statusLabel =
    person.status === "pending"
      ? "Pending"
      : person.status === "expired"
        ? "Expired"
        : null;

  return (
    <li
      className={`flex min-h-18 items-center gap-2 px-4 py-2.5 ${
        justInvited ? "bg-selected" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="type-body-strong truncate text-heading">
            {displayName}
            {person.isSelf && " (you)"}
          </p>

          {statusLabel && (
            <span
              className={`type-badge inline-flex w-22 items-center gap-1 rounded-pill border py-0.5 pr-2 pl-1.5 ${
                person.status === "expired"
                  ? "border-line-error bg-error-tint text-error"
                  : "border-line-warning bg-status-requested-tint text-status-requested-text"
              }`}
            >
              {person.status === "expired" ? (
                <AlertCircle aria-hidden="true" className="size-3.5" />
              ) : (
                <Clock3 aria-hidden="true" className="size-3.5" />
              )}
              {statusLabel}
            </span>
          )}
        </div>

        {person.status === "active" && (
          <p className="type-caption truncate text-body-muted">
            {person.email}
          </p>
        )}

        {person.status !== "active" && (
          <p className="type-caption truncate text-body-muted">
            {justInvited ? (
              "Invited just now"
            ) : (
              <>
                {person.status === "expired" ? "Sent" : "Invited"}{" "}
                {formatInviteDate(person.invitedAt)}
                {person.status === "expired" && " · link expired"}
              </>
            )}
          </p>
        )}
      </div>

      <span className="type-body-sm w-19 text-right capitalize">
        {person.role}
      </span>

      {person.isSelf ? (
        <div aria-hidden="true" className="size-11 shrink-0" />
      ) : (
        <PersonActionsMenu
          person={person}
          disabled={menuDisabled}
          triggerRef={triggerRef}
          onAction={onAction}
        />
      )}
    </li>
  );
}

function formatInviteDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : inviteDateFormatter.format(date);
}

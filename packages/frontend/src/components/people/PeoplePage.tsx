import type { Person } from "@repo/common";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertCircle, ChevronLeft, Clock3, MoreVertical } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PeopleSearchInput } from "@frontend/components/ui/PeopleSearchInput.tsx";
import { trpc } from "@frontend/lib/trpc.ts";

const inviteDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const emptyPeople: Person[] = [];

/**
 * Displays the admin's people list. The API supplies the invite-first ordering;
 * this component only filters those rows for the local search field.
 */
export function PeoplePage() {
  const [search, setSearch] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const peopleQuery = useQuery(trpc.people.list.queryOptions());
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

  useEffect(() => {
    if (!peopleQuery.isPending) {
      titleRef.current?.focus();
    }
  }, [peopleQuery.isPending]);

  if (peopleQuery.isPending) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-md bg-surface">
        <output className="type-body block p-4 text-body">
          Loading people...
        </output>
      </main>
    );
  }

  if (peopleQuery.isError) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-md bg-surface">
        <p role="alert" className="type-body p-4 text-error">
          The people list couldn&apos;t load. Please try again later.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md bg-surface">
      <header className="border-b border-divider">
        <div className="flex h-14 items-center gap-2 px-1">
          <Link // Back button to Records page
            to="/"
            aria-label="Back to records"
            className="grid size-11 shrink-0 place-items-center rounded-pill text-icon-primary hover:bg-hover"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Link>
          <h1 // Page Title
            ref={titleRef}
            tabIndex={-1}
            className="type-h2 overflow-hidden text-ellipsis"
          >
            People &amp; invitations
          </h1>
        </div>
      </header>

      <div className="px-4">
        {/* Search bar for searching members */}
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

        {/* Display amount of members, invites, search results */}
        <p className="type-caption mt-1 mb-2 text-body-muted">
          {normalizedSearch ? (
            // Number of matching members (from search)
            <>
              Showing{" "}
              <strong className="font-bold text-heading">
                {matchingPeopleCount}
              </strong>{" "}
              results
            </>
          ) : (
            <>
              {/* Number of active members */}
              <strong className="font-bold text-heading">
                {formatCount(memberCount, "member")}
              </strong>
              {/* and number of invites (if any) */}
              {inviteCount > 0 && <> · {formatCount(inviteCount, "invite")}</>}
            </>
          )}
        </p>
      </div>

      {/* STUB CODE FOR SEARCH FUNCTION :D */}
      {people.length > 0 ? (
        <ul
          aria-label="People and invitations"
          className="divide-y divide-divider"
        >
          {people.map((person) => (
            <PersonRow key={person.id} person={person} />
          ))}
        </ul>
      ) : (
        <p className="type-body p-4 text-body-muted">
          No people match your search.
        </p>
      )}
    </main>
  );
}

function formatCount(count: number, singular: string) {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

function PersonRow({ person }: { person: Person }) {
  const displayName = person.name || person.email;
  const statusLabel =
    person.status === "pending"
      ? "Pending"
      : person.status === "expired"
        ? "Expired"
        : null;

  return (
    <li className="flex min-h-18 items-center gap-2 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {/* Displays email or member name */}
          <p className="type-body-strong truncate text-heading">
            {displayName}
            {person.isSelf && " (you)"}
          </p>

          {/* Pill that shows either "Pending" or "Expired" */}
          {statusLabel && (
            <span
              className={`type-badge inline-flex items-center gap-1 w-22 rounded-pill border pl-1.5 pr-2 py-0.5 ${
                person.status === "expired"
                  ? "border-line-error bg-error-tint text-error"
                  : "bg-status-requested-tint text-status-requested-text border-line-warning"
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

        {/* Shows email for active member */}
        {person.status === "active" && (
          <p className="type-caption truncate text-body-muted">
            {person.email}
          </p>
        )}

        {/* Shows invite info for not-yet-active-members */}
        {person.status !== "active" && (
          <p className="type-caption truncate text-body-muted">
            {/* "Sent <Month> <Day>" OR "Invited <Month> <Day>" */}
            {person.status === "expired" ? "Sent" : "Invited"}{" "}
            {formatInviteDate(person.invitedAt)}
            {/* "link expired" if status is expired */}
            {person.status === "expired" && " · link expired"}
          </p>
        )}
      </div>

      {/* Display role - Admin or Volunteer */}
      <span className="type-body-sm w-19 text-right capitalize">
        {person.role}
      </span>

      {/* Show ⋮ for users that aren't you */}
      {person.isSelf ? (
        <div aria-hidden="true" className="size-11 shrink-0" />
      ) : (
        <button
          // INSERT ⋮ FUNCTIONALITY HERE!
          type="button"
          aria-label={`More actions for ${displayName}`}
          aria-haspopup="menu"
          className="flex justify-center items-center rounded-pill size-11"
        >
          <MoreVertical className="size-5 text-icon-primary" />
        </button>
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

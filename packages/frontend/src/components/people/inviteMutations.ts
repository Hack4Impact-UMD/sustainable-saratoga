import type { Person } from "@repo/common";
import { isQueuedOffline } from "@frontend/lib/offlineSync.ts";

export type RowFailure = "unknown" | "queued" | "server";

/** A transport error leaves the server result unknown. */
export function classifyRowFailure(error: unknown): RowFailure {
  if (isQueuedOffline(error)) return "queued";
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "unknown";
  }
  if (error instanceof TypeError) return "unknown";
  if (
    error instanceof Error &&
    /failed to fetch|networkerror|load failed/i.test(error.message)
  ) {
    return "unknown";
  }
  return "server";
}

export function withoutPerson(people: Person[], id: string): Person[] {
  return people.filter((person) => person.id !== id);
}

/** Next visible non-self row, searching after the removed row and then before it. */
export function nextActionableId(
  people: Person[],
  removedId: string,
): string | null {
  const index = people.findIndex((person) => person.id === removedId);
  const after = people.slice(index + 1).find((person) => !person.isSelf);
  if (after) return after.id;
  const before = people
    .slice(0, Math.max(index, 0))
    .reverse()
    .find((person) => !person.isSelf);
  return before?.id ?? null;
}

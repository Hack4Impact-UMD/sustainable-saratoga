const formatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-09-14" -> "Sep 14, 2026". Anything unparseable is returned as-is. */
export function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00Z` : value,
  );
  return Number.isNaN(date.getTime()) ? value : formatter.format(date);
}

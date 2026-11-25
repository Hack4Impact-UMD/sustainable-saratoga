
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { listSampleRecords } from "@frontend/lib/sampleRecords.ts";
import { trpc } from "@frontend/lib/trpc.ts";

export const Route = createFileRoute("/_authenticated/records/")({
  component: AllRecordsPage,
});

function AllRecordsPage() {
  const [search, setSearch] = useState("");

  const recordsQuery = useQuery(trpc.records.list.queryOptions());

  const allRecords = useMemo(() => {
  const savedRecords = recordsQuery.data ?? [];
  const savedIds = new Set(savedRecords.map((record) => record.id));

  return [
    ...savedRecords.map((record) => ({
      record,
      source: "Saved" as const,
    })),

    ...listSampleRecords()
      .filter((record) => !savedIds.has(record.id))
      .map((record) => ({
        record,
        source: "Sample" as const,
      })),
  ];
}, [recordsQuery.data]);

  const filteredRecords = allRecords.filter(({ record }) => {
    const searchValue = search.toLowerCase().trim();

    if (!searchValue) return true;

    return [
  record.id,
  record.address,
  record.city,
  record.state,
  record.species,
  record.cultivar,
  record.responsible,
]
  .filter(Boolean)
  .some((value) =>
    String(value).toLowerCase().includes(searchValue),
  );
  });

  return (
    <main className="min-h-dvh w-full bg-surface px-6 py-6">
      <h1 className="text-2xl font-semibold text-heading">All Records</h1>

      <div className="relative my-5">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-body-muted" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search records..."
          className="h-11 w-full rounded-lg border border-border bg-surface pl-10 pr-3 text-sm text-heading outline-none focus:border-primary"
        />
      </div>

      {recordsQuery.isPending && (
        <p className="py-6 text-center text-sm text-body-muted">
          Loading records...
        </p>
      )}

      {recordsQuery.isError && (
        <p role="alert" className="py-6 text-center text-sm text-error">
          Couldn't load saved records. Please try again.
        </p>
      )}

      {!recordsQuery.isPending && !recordsQuery.isError && (
        <div className="space-y-3">
          {filteredRecords.map(({ record, source }) => (
            <Link
              key={`${source}-${record.id}`}
              to="/records/$recordId"
              params={{ recordId: record.id }}
              className="block rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-hover"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-heading">
                  {record.address || "Address not added"}
                </h2>

                <span className="shrink-0 rounded-full bg-surface-secondary px-2 py-1 text-xs text-body-muted">
                  {source}
                </span>
              </div>

              <p className="mt-1 text-sm text-body-muted">
                {[record.city, record.state].filter(Boolean).join(", ")}
              </p>

              <div className="mt-3 space-y-1 text-sm text-body-muted">
                <p>Species: {record.species || "—"}</p>
                <p>Cultivar: {record.cultivar || "—"}</p>
              </div>

              <p className="mt-3 text-xs text-body-muted">
                Record ID: {record.id}
              </p>
            </Link>
          ))}

          {filteredRecords.length === 0 && (
            <p className="py-8 text-center text-sm text-body-muted">
              No records found.
            </p>
          )}
        </div>
      )}
    </main>
  );
}

import { matchesSearch } from "@frontend/lib/search.ts";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import type { TreeStatus } from "@repo/common";
import { cn } from "cn";
import { Button } from "@frontend/components/ui/button.tsx";
import { Checkbox } from "@frontend/components/ui/checkbox.tsx";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@frontend/components/ui/sheet.tsx";
import { StatusMarker } from "@frontend/components/status/StatusMarker.tsx";
import { trpc } from "@frontend/lib/trpc.ts";
import {
  type Filters,
  STATUSES,
  allStatusesSelected,
  toMarkerQueryInput,
} from "@frontend/lib/filters.ts";

const STATUS_LABEL: Record<TreeStatus, string> = {
  requested: "Requested",
  possible: "Possible",
  approved: "Approved",
  planted: "Planted",
};

type FilterSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Filters currently in the URL. */
  applied: Filters;
  /** Called with the confirmed filters; the parent writes them to the URL. */
  onApply: (next: Filters) => void;
  query: string;
};

export function FilterSheet({ open, onClose, applied, onApply, query}: FilterSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[90dvh] gap-0 p-0"
      >
        {/* Unmounts when the sheet closes, so the draft resets on every open. */}
        <FilterSheetBody applied={applied} onClose={onClose} onApply={onApply} query={query} />
      </SheetContent>
    </Sheet>
  );
}

function FilterSheetBody({
  applied,
  onClose,
  onApply,
  query
}: Omit<FilterSheetProps, "open">) {
  const [draft, setDraft] = useState<Filters>(applied);

  // Count for the button = the same server query the map will run.
  const draftQuery = useQuery(trpc.map.markers.queryOptions(toMarkerQueryInput(draft)));
  // Unfiltered list, only used to know which years exist.
  const allQuery = useQuery(trpc.map.markers.queryOptions({}));
  const availableYears = [
    ...new Set((allQuery.data ?? []).map((m) => m.seasonYear)),
  ].sort((a, b) => b - a);

  const allYears = draft.years.length === 0;
  const allStatuses = allStatusesSelected(draft.statuses);
  const noStatuses = draft.statuses.length === 0;
  const isDefault = allYears && allStatuses;

  // The server treats an empty status list as "no filter", so handle it here.
  // TODO: also apply matchesSearch(marker, draft.q) once lib/search.ts exists,
  // so the count matches what the list shows when search text is present.
  const matchingRecords = (draftQuery.data ?? []).filter((marker) =>
  matchesSearch(marker, query),
);

const count = noStatuses
  ? 0
  : draftQuery.isPending
    ? undefined
    : matchingRecords.length;

  function toggleYear(year: number) {
    setDraft((d) => ({
      ...d,
      years: d.years.includes(year)
        ? d.years.filter((y) => y !== year)
        : [...d.years, year],
    }));
  }

  function toggleStatus(status: TreeStatus) {
    setDraft((d) => ({
      ...d,
      statuses: d.statuses.includes(status)
        ? d.statuses.filter((s) => s !== status)
        : [...d.statuses, status],
    }));
  }

  function confirm() {
    onApply(draft);
    onClose();
  }

  return (
    <>
      <SheetHeader className="flex-row items-center justify-between px-margin py-4">
        <SheetTitle className="[font:var(--type-h2)]">Filters</SheetTitle>
        <Button variant="ghost" onClick={onClose}>
          <X aria-hidden /> Close
        </Button>
      </SheetHeader>

      {/* Only this part scrolls; the footer stays pinned. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <section>
          <SectionHeader
            title="Year"
            summary={allYears ? "All years" : `${draft.years.length} selected`}
          />
          <div className="flex flex-wrap gap-2 px-margin py-4">
            <YearChip
              selected={allYears}
              onClick={() => setDraft((d) => ({ ...d, years: [] }))}
            >
              All years
            </YearChip>
            {availableYears.map((year) => (
              <YearChip
                key={year}
                selected={draft.years.includes(year)}
                onClick={() => toggleYear(year)}
              >
                {year}
              </YearChip>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader
            title="Status"
            summary={allStatuses ? "All statuses" : `${draft.statuses.length} selected`}
            onClear={
              allStatuses
                ? undefined
                : () => setDraft((d) => ({ ...d, statuses: [...STATUSES] }))
            }
          />
          <div className="flex flex-col gap-2 px-margin py-4">
            <StatusRow
              label="Select all"
              strong
              checked={allStatuses}
              indeterminate={!allStatuses && !noStatuses}
              onChange={(checked) =>
                setDraft((d) => ({ ...d, statuses: checked ? [...STATUSES] : [] }))
              }
            />
            {STATUSES.map((status) => (
              <StatusRow
                key={status}
                label={STATUS_LABEL[status]}
                icon={<StatusMarker status={status} size={24} />}
                checked={draft.statuses.includes(status)}
                onChange={() => toggleStatus(status)}
              />
            ))}
          </div>
        </section>
      </div>

      <SheetFooter className="flex-row gap-3 border-t border-divider bg-surface px-margin py-4">
        <Button
          variant="outline"
          disabled={isDefault}
          onClick={() =>
            setDraft((d) => ({ ...d, years: [], statuses: [...STATUSES] }))
          }
        >
          Reset
        </Button>
        <Button className="flex-1" disabled={noStatuses} onClick={confirm}>
          Show {count ?? "…"} {count === 1 ? "record" : "records"}
        </Button>
      </SheetFooter>
    </>
  );
}

function SectionHeader({
  title,
  summary,
  onClear,
}: {
  title: string;
  summary: string;
  onClear?: () => void;
}) {
  return (
    <div className="flex items-center justify-between bg-pressed px-margin py-3">
      <h3 className="type-h4">{title}</h3>
      <span className="flex items-center gap-3">
        <span className="type-caption">{summary}</span>
        {onClear && (
          <button type="button" className="type-link" onClick={onClear}>
            Clear
          </button>
        )}
      </span>
    </div>
  );
}

function YearChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "type-chip flex min-h-touch items-center gap-2 rounded-pill border px-4",
        selected
          ? "border-primary bg-selected text-primary"
          : "border-line bg-surface",
      )}
    >
      {selected && <Check aria-hidden className="size-4" />}
      {children}
    </button>
  );
}

function StatusRow({
  label,
  icon,
  checked,
  indeterminate,
  strong,
  onChange,
}: {
  label: string;
  icon?: React.ReactNode;
  checked: boolean;
  indeterminate?: boolean;
  strong?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-touch cursor-pointer items-center gap-3 rounded-sm px-3",
        checked && "bg-selected",
      )}
    >
      <Checkbox
        checked={checked}
        indeterminate={indeterminate}
        onCheckedChange={onChange}
      />
      {icon}
      <span className={strong ? "type-body-strong" : "type-body"}>{label}</span>
    </label>
  );
}
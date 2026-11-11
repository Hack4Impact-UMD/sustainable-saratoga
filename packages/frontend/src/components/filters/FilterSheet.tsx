import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import type { TreeStatus } from "@repo/common";
import { cn } from "cn";
import { Button } from "@frontend/components/ui/button.tsx";
import { Checkbox } from "@frontend/components/ui/checkbox.tsx";
import {
  Sheet,
  SheetContent,
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
};

export function FilterSheet({
  open,
  onClose,
  applied,
  onApply,
}: FilterSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      {/* The ! overrides beat the sheet's default auto height, gap and rounded top. */}
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="!h-dvh !max-h-dvh !gap-0 !rounded-none p-0"
      >
        {/* Unmounts when the sheet closes, so the draft resets on every open. */}
        <FilterSheetBody
          applied={applied}
          onClose={onClose}
          onApply={onApply}
        />
      </SheetContent>
    </Sheet>
  );
}

function FilterSheetBody({
  applied,
  onClose,
  onApply,
}: Omit<FilterSheetProps, "open">) {
  const [draft, setDraft] = useState<Filters>(applied);
  const [statusOpen, setStatusOpen] = useState(true);

  // Count for the button = the same server query the map will run.
  const draftQuery = useQuery(
    trpc.map.markers.queryOptions(toMarkerQueryInput(draft)),
  );
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
  // TODO: also apply matchesSearch(marker, draft.q) once lib/search.ts exists.
  const count = noStatuses ? 0 : draftQuery.data?.length;

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
      {/* Header: 64px, bottom divider. Right padding is 8px because the
          Close button has its own 44px hit area. */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-divider bg-surface pr-2 pl-margin">
        <SheetTitle className="[font:var(--type-h2)]">Filters</SheetTitle>
        <Button
          variant="ghost"
          className="!h-touch gap-2 px-3"
          onClick={onClose}
        >
          <X aria-hidden className="size-5" />
          Close
        </Button>
      </header>

      {/* Only this part scrolls; the footer stays pinned. */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-surface">
        <section>
          <SectionHeader
            title="Year"
            summary={allYears ? "All years" : `${draft.years.length} selected`}
            onClear={
              allYears ? undefined : () => setDraft((d) => ({ ...d, years: [] }))
            }
          />
          <div className="flex flex-wrap items-start gap-2 px-margin py-4">
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
            summary={
              allStatuses ? "All statuses" : `${draft.statuses.length} selected`
            }
            onClear={
              allStatuses
                ? undefined
                : () => setDraft((d) => ({ ...d, statuses: [...STATUSES] }))
            }
            expanded={statusOpen}
            onToggle={() => setStatusOpen((o) => !o)}
            controlsId="status-list"
          />
          {statusOpen && (
            <div
              id="status-list"
              className="flex flex-col gap-1 px-margin py-4"
            >
              <StatusRow
                label="Select all"
                strong
                checked={allStatuses}
                indeterminate={!allStatuses && !noStatuses}
                onChange={(checked) =>
                  setDraft((d) => ({
                    ...d,
                    statuses: checked ? [...STATUSES] : [],
                  }))
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
          )}
        </section>
      </div>

      {/* Footer: top divider, 12/16 padding plus the phone's bottom safe area. */}
      <footer className="flex shrink-0 items-center gap-3 border-t border-divider bg-surface px-margin pt-3 pb-[calc(var(--space-3)+env(safe-area-inset-bottom,0px))]">
        <Button
          variant="secondary"
          className="!h-control px-6"
          disabled={isDefault}
          onClick={() =>
            setDraft((d) => ({ ...d, years: [], statuses: [...STATUSES] }))
          }
        >
          Reset
        </Button>
        <Button
          className="!h-control flex-1"
          disabled={noStatuses}
          onClick={confirm}
        >
          Show {count ?? "…"} {count === 1 ? "record" : "records"}
        </Button>
      </footer>
    </>
  );
}

function SectionHeader({
  title,
  summary,
  onClear,
  expanded,
  onToggle,
  controlsId,
}: {
  title: string;
  summary: string;
  onClear?: () => void;
  expanded?: boolean;
  onToggle?: () => void;
  controlsId?: string;
}) {
  return (
    <div className="flex min-h-control items-center justify-between gap-3 bg-pressed px-margin py-2">
      <h3 className="type-h4">{title}</h3>
      <div className="flex items-center gap-3">
        <span className="type-caption">{summary}</span>
        {onClear && (
          <button type="button" className="type-link" onClick={onClear}>
            Clear
          </button>
        )}
        {onToggle && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={controlsId}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${title}`}
            onClick={onToggle}
            className="-mr-2 grid size-touch place-items-center text-icon-primary"
          >
            {expanded ? (
              <ChevronUp aria-hidden className="size-5" />
            ) : (
              <ChevronDown aria-hidden className="size-5" />
            )}
          </button>
        )}
      </div>
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
        "type-chip flex h-10 items-center gap-2 rounded-pill",
        selected
          ? "border-2 border-primary bg-selected pr-4 pl-3 text-primary"
          : "border border-line bg-surface px-4",
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
        "flex h-control w-full cursor-pointer items-center gap-3 rounded-[4px] border-b border-divider px-4 py-3",
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
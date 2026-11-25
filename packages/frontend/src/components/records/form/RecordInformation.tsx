import type { TreeRecord } from "@repo/common";
import { ChevronDown, Lock } from "lucide-react";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@frontend/components/ui/collapsible.tsx";
import { formatDate } from "@frontend/lib/formatDate.ts";

function InfoItem({
  label,
  value,
  note,
  wide,
}: {
  label: string;
  value: string | null | undefined;
  note?: string | null;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <dt className="type-caption text-body-muted">{label}</dt>
      <dd className="type-body text-body">
        {value ? value : <span className="text-body-muted">Not recorded</span>}
        {value && note && (
          <span className="type-caption block text-body-muted">{note}</span>
        )}
      </dd>
    </div>
  );
}

/**
 * Read-only "Record information" section (E1). Same look as RecordSection,
 * plus the lock + "Automatic" label in the title bar.
 */
export function RecordInformation({ record }: { record: TreeRecord }) {
  const info = record.recordInformation;

  return (
    <Collapsible
      defaultOpen
      className="border-t border-divider first:border-t-0"
    >
      <h2 className="m-0">
        <CollapsibleTrigger className="group flex h-[57px] w-full items-center gap-2 bg-pressed px-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset">
          <span className="type-h2 text-heading">Record information</span>
          <span className="type-caption ml-auto flex items-center gap-1 text-body-muted">
            <Lock aria-hidden="true" className="size-4 text-icon-primary" />
            <span className="underline underline-offset-2">Automatic</span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-6 shrink-0 text-icon-primary transition-transform group-data-panel-open:rotate-180"
          />
        </CollapsibleTrigger>
      </h2>
      <CollapsiblePanel className="bg-surface px-4 py-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          <InfoItem
            label="Last edited"
            value={formatDate(info.lastEditedAt)}
            note={info.lastEditedBy}
          />
          <InfoItem
            label="Created"
            value={formatDate(info.createdAt)}
            note={info.createdBy}
          />
          <InfoItem label="Record ID" value={record.id} wide />
        </dl>
      </CollapsiblePanel>
    </Collapsible>
  );
}
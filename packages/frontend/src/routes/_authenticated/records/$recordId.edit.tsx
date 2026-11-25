import type { TreeRecord } from "@repo/common";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { RecordForm } from "@frontend/components/records/form/RecordForm.tsx";
import { recordToFormValues } from "@frontend/components/records/form/recordFormValues.ts";
import { useRecordForm } from "@frontend/components/records/form/useRecordForm.ts";
import { Button } from "@frontend/components/ui/button.tsx";
import { getSampleRecord } from "@frontend/lib/sampleRecords.ts";

export const Route = createFileRoute("/_authenticated/records/$recordId/edit")({
  component: EditRecordPage,
});

function EditRecordPage() {
  const { recordId } = Route.useParams();
  // TODO: replace sample data with a backend query once full records exist.
  const record = getSampleRecord(recordId);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md bg-surface">
      {record ? (
        <EditRecord record={record} />
      ) : (
        <p role="alert" className="type-body p-4 text-body">
          Record not found.
        </p>
      )}
    </main>
  );
}

function EditRecord({ record }: { record: TreeRecord }) {
  const initial = useMemo(() => recordToFormValues(record), [record]);
  const form = useRecordForm(initial);
  const countLabel =
    form.changedCount === 1
      ? "You changed 1 field"
      : `You changed ${form.changedCount} fields`;

  return (
    <>
      <div className="sticky top-0 z-20 grid h-14 grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-divider bg-surface px-4">
        <Link
          to="/records/$recordId"
          params={{ recordId: record.id }}
          className="type-body-strong text-heading"
        >
          Cancel
        </Link>
        <div className="min-w-0 text-center">
          <h1 className="type-body-strong font-display text-heading">
            Edit record
          </h1>
          <p className="type-caption truncate text-body-muted">
            {record.address} · Tree #{record.treeNumber}
          </p>
        </div>
        <Button
          type="button"
          disabled={form.changedCount === 0}
          className="h-9 px-4"
        >
          Save
        </Button>
      </div>
      {form.changedCount > 0 && (
        <p role="status" className="type-caption bg-selected px-4 py-2 text-primary">
          {countLabel}
        </p>
      )}
      <RecordForm form={form} record={record} />
    </>
  );
}
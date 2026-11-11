import { createFileRoute } from "@tanstack/react-router";
import { RecordDetails } from "@frontend/components/records/RecordDetails.tsx";
import { getSampleRecord } from "@frontend/lib/sampleRecords.ts";

export const Route = createFileRoute("/_authenticated/records/$recordId")({
  component: RecordPage,
});

function RecordPage() {
  const { recordId } = Route.useParams();
  // TODO: replace sample data with a backend query once full records exist.
  const record = getSampleRecord(recordId);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md bg-surface">
      {record ? (
        <RecordDetails record={record} />
      ) : (
        <p role="alert" className="type-body p-4 text-body">
          Record not found.
        </p>
      )}
    </main>
  );
}

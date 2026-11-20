import { createFileRoute } from "@tanstack/react-router";
import { RecordFullMap } from "@frontend/components/records/RecordFullMap.tsx";
import {
  getSampleRecord,
  listSampleRecords,
} from "@frontend/lib/sampleRecords.ts";

export const Route = createFileRoute("/_authenticated/records/$recordId/map")({
  component: RecordMapPage,
});

function RecordMapPage() {
  const { recordId } = Route.useParams();
  // TODO: replace sample data with a backend query once full records exist.
  const record = getSampleRecord(recordId);

  if (!record) {
    return (
      <p role="alert" className="type-body p-4 text-body">
        Record not found.
      </p>
    );
  }
  return (
    <main className="mx-auto w-full max-w-md">
      <RecordFullMap record={record} others={listSampleRecords()} />
    </main>
  );
}

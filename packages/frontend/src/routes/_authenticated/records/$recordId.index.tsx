import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { RecordDetails } from "@frontend/components/records/RecordDetails.tsx";
import { trpc } from "@frontend/lib/trpc.ts";
import { getSampleRecord } from "@frontend/lib/sampleRecords.ts";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/records/$recordId/")({
  component: RecordPage,
});

function RecordPage() {
  const { recordId } = Route.useParams();

  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("showRecordToast") === "true") {
      setShowToast(true);
      sessionStorage.removeItem("showRecordToast");
    }
  }, []);

  const recordQuery = useQuery(
    trpc.records.getById.queryOptions({ id: recordId }),
  );

  const record = recordQuery.data ?? getSampleRecord(recordId);

  if (recordQuery.isPending && !record) {
    return <main>Loading record...</main>;
  }

  if (!record) {
    return <main>Record not found.</main>;
  }

  return (
    <>
      {showToast && (
        <div className="fixed bottom-5 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-[520px] -translate-x-1/2">
          <div className="flex items-center gap-4 rounded-[24px] bg-[#292b2b] px-5 py-4 text-white shadow-xl">
            {/* Success icon */}
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full border-[3px] border-[#a8d77c] text-[#a8d77c]">
              ✓
            </div>

            {/* Toast text */}
            <div className="min-w-0 flex-1">
              <p style={{ color: "#ffffff" }} className="text-[16px] font-bold">
                Record created
              </p>

              <p style={{ color: "#a8d77c" }} className="text-[14px]">
                Synced
              </p>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowToast(false)}
              style={{ color: "#ffffff" }}
              className="shrink-0 px-2 text-[24px] font-normal"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <RecordDetails record={record} />
    </>
  );
}

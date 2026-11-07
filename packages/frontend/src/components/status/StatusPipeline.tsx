import { recordPipelineState } from "@repo/common";
import type { RecordPipelineState, TreeStatus } from "@repo/common";
import { StatusMarker } from "@frontend/components/status/StatusMarker.tsx";

const labels: Record<TreeStatus, string> = {
  requested: "Requested",
  possible: "Possible",
  approved: "Approved",
  planted: "Planted",
};

export function StatusPipeline({ status, origin }: RecordPipelineState) {
  recordPipelineState.assert({ status, origin });
  const steps: TreeStatus[] = [origin, "approved", "planted"];
  const currentIndex = steps.indexOf(status);

  return (
    <ol
      aria-label={`Status: ${labels[status]}`}
      className="isolate flex w-full items-start rounded-sm border border-divider bg-surface px-3 py-3.5"
      data-testid="status-pipeline"
    >
      {steps.map((step, index) => {
        const isCurrent = step === status;
        const isComplete = currentIndex > index;

        return (
          <li
            key={step}
            aria-current={isCurrent ? "step" : undefined}
            className="relative flex min-w-0 flex-1 flex-col items-center gap-1"
            data-state={
              isCurrent ? "current" : isComplete ? "complete" : "upcoming"
            }
          >
            {index > 0 && (
              <span
                aria-hidden="true"
                className={`absolute -left-1/2 top-3 -z-10 h-0.5 w-full -translate-y-1/2 ${currentIndex >= index ? "bg-primary" : "bg-divider"}`}
              />
            )}
            <StatusMarker status={step} selected={isCurrent} flat size={24} />
            <span
              className={`type-caption text-center ${isCurrent ? "font-bold text-heading" : ""}`}
            >
              {labels[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

import { recordPipelineState } from "@repo/common";
import type { RecordPipelineState, TreeStatus } from "@repo/common";
import { StatusPin } from "@frontend/components/status/StatusPin.tsx";

const labels: Record<TreeStatus, string> = {
  requested: "Requested",
  possible: "Possible",
  approved: "Approved",
  planted: "Planted",
};

/** Underline colour of the current step, matching its pin. */
const underlineColors: Record<TreeStatus, string> = {
  requested: "decoration-status-requested",
  possible: "decoration-status-possible",
  approved: "decoration-status-approved-ring",
  planted: "decoration-status-planted",
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
            <StatusPin
              status={step}
              selected={isCurrent}
              upcoming={index > currentIndex}
              width={24}
            />
            <span
              className={`type-caption text-center ${isCurrent ? `font-bold text-heading underline decoration-[3px] underline-offset-4 ${underlineColors[step]}` : ""}`}
            >
              {labels[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

import { ChevronDown, ChevronUp, Lock } from "lucide-react";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@frontend/components/ui/collapsible.tsx";

interface RecordSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  dropdown?: boolean;
}

/** One record section: full-width gray title bar, white content. */
export function RecordSection({
  title,
  defaultOpen = false,
  children,
  dropdown = true,
}: RecordSectionProps) {
  if (!dropdown) {
    return (
      <section className="border-t border-divider first:border-t-0">
        <h2 className="m-0">
          <div className="flex w-full items-center justify-between gap-2 bg-pressed h-[57px] px-4 text-left">
            <span className="type-h2 text-heading">{title}</span>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Lock aria-hidden="true" className="size-5 text-icon-primary" />
                <span className="text-sm text-body underline">Automatic</span>
              </div>

              <ChevronUp
                aria-hidden="true"
                className="size-6 shrink-0 text-icon-primary"
              />
            </div>
          </div>
        </h2>

        <div className="bg-surface px-4 py-4">{children}</div>
      </section>
    );
  }

  // Original collapsible section (all other sections)
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="border-t border-divider first:border-t-0"
    >
      <h2 className="m-0">
        <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 bg-pressed h-[57px] px-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset">
          <span className="type-h2 text-heading">{title}</span>
          <ChevronDown
            aria-hidden="true"
            className="size-6 shrink-0 text-icon-primary transition-transform group-data-panel-open:rotate-180"
          />
        </CollapsibleTrigger>
      </h2>

      <CollapsiblePanel className="bg-surface px-4 py-4">
        {children}
      </CollapsiblePanel>
    </Collapsible>
  );
}

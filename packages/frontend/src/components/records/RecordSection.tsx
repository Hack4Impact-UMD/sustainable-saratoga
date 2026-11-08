import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@frontend/components/ui/collapsible.tsx";

interface RecordSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/** One collapsible section: full-width gray title bar, white content. */
export function RecordSection({
  title,
  defaultOpen = false,
  children,
}: RecordSectionProps) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="border-t border-divider first:border-t-0"
    >
      <h2 className="m-0">
        <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 bg-pressed px-4 py-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset">
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

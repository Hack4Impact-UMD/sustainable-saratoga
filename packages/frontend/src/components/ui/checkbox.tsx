import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cn } from "cn";
import { CheckIcon, MinusIcon } from "lucide-react";

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "relative flex size-6 shrink-0 items-center justify-center rounded-sm border border-line-strong bg-surface outline-none transition-colors",
        "after:absolute after:-inset-2",
        "focus-visible:shadow-focus",
        "data-checked:border-primary data-checked:bg-primary data-checked:text-on-primary",
        "data-indeterminate:border-line-strong data-indeterminate:bg-pressed data-indeterminate:text-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current [&>svg]:size-4"
      >
        {props.indeterminate ? <MinusIcon aria-hidden /> : <CheckIcon aria-hidden />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
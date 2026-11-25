import { useId } from "react";
import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "cn";
import { FieldError } from "@frontend/components/ui/field.tsx";
import { Label } from "@frontend/components/ui/label.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@frontend/components/ui/popover.tsx";

export interface FieldRenderProps {
  id: string;
  labelId: string;
  invalid: boolean;
  describedBy: string | undefined;
}

interface FormFieldProps {
  label: string;
  info?: string;
  required?: boolean;
  error?: string;
  group?: boolean;
  inline?: boolean;
  className?: string;
  children: (props: FieldRenderProps) => ReactNode;
}

/** Label, info icon, control and error message for one form field. */
export function FormField({
  label,
  info,
  required,
  error,
  group,
  inline,
  className,
  children,
}: FormFieldProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  const invalid = Boolean(error);

  return (
    <div
      data-invalid={invalid || undefined}
      className={cn("flex flex-col gap-2", className)}
    >
      <div
        className={cn(
          "flex gap-2",
          inline ? "flex-row items-center justify-between" : "flex-col",
        )}
      >
        <span className="flex items-center gap-1">
          {group ? (
            <span id={labelId} className="type-body-strong text-heading">
              {label}
            </span>
          ) : (
            <Label htmlFor={id} id={labelId} className="type-body-strong">
              {label}
            </Label>
          )}
          {required && (
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          )}
          {info && (
            <Popover>
              <PopoverTrigger
                aria-label={`About ${label}`}
                className="-m-1 inline-flex size-6 items-center justify-center rounded-pill text-icon-secondary outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <Info aria-hidden="true" className="size-4" />
              </PopoverTrigger>
              <PopoverContent aria-label={label}>{info}</PopoverContent>
            </Popover>
          )}
        </span>
        {children({
          id,
          labelId,
          invalid,
          describedBy: invalid ? errorId : undefined,
        })}
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}
import { useId, useRef, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "cn";
import { Input } from "@frontend/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@frontend/components/ui/select.tsx";

interface ControlProps {
  id?: string;
  invalid?: boolean;
  describedBy?: string;
}

const controlBase =
  "w-full rounded-input border border-input bg-transparent px-3 type-body text-heading transition-colors outline-none placeholder:text-body-muted focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 disabled:opacity-50";

/** Single-line text box, 44 tall. */
export function TextInput({
  value,
  onChange,
  invalid,
  describedBy,
  ...props
}: ControlProps &
  Omit<React.ComponentProps<"input">, "value" | "onChange"> & {
    value: string;
    onChange: (value: string) => void;
  }) {
  return (
    <Input
      {...props}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={cn("h-11 px-3", props.className)}
    />
  );
}

export function TextArea({
  id,
  value,
  onChange,
  invalid,
  describedBy,
  rows = 3,
}: ControlProps & {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      id={id}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={cn(controlBase, "min-h-24 resize-y py-2.5")}
    />
  );
}

/** Number box with a fixed "ft" on the right. */
export function NumberInput({
  id,
  value,
  onChange,
  invalid,
  describedBy,
  unit = "ft",
}: ControlProps & {
  value: string;
  onChange: (value: string) => void;
  unit?: string;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="h-11 px-3 pr-10"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center type-body text-body-muted"
      >
        {unit}
      </span>
    </div>
  );
}

/**
 * Side-by-side buttons where exactly one is picked (DPW / Private, Yes / No).
 * Built on real radio inputs, so arrow keys and screen readers work for free.
 */
export function SegmentedChoice({
  options,
  value,
  onChange,
  labelledBy,
  size = "md",
}: {
  options: string[];
  value: string | null;
  onChange: (value: string) => void;
  labelledBy: string;
  size?: "md" | "sm";
}) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className={cn(
        "grid grid-cols-2 gap-3",
        size === "sm" ? "w-36 gap-2" : "w-full",
      )}
    >
      {options.map((option) => (
        <label key={option} className="relative block cursor-pointer">
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            className="peer sr-only"
          />
          <span
            className={cn(
              "flex items-center justify-center rounded-input border border-line-strong bg-surface type-btn-secondary text-heading transition-colors hover:bg-hover peer-checked:border-primary peer-checked:bg-selected peer-checked:text-primary peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
              size === "sm" ? "h-10" : "h-11",
            )}
          >
            {option}
          </span>
        </label>
      ))}
    </div>
  );
}

/**
 * Vertical single-choice list. With `allowOther`, the last row is "Other:" with
 * a text box. The typed text is the field's value, so it stays one field.
 */
export function RadioList({
  options,
  value,
  onChange,
  labelledBy,
  allowOther,
  otherLabel = "Other",
  otherPlaceholder = "Type a short answer",
}: {
  options: string[];
  value: string | null;
  onChange: (value: string | null) => void;
  labelledBy: string;
  allowOther?: boolean;
  otherLabel?: string;
  otherPlaceholder?: string;
}) {
  const name = useId();
  const otherInput = useRef<HTMLInputElement>(null);
  const [otherActive, setOtherActive] = useState(false);

  const isPreset = value !== null && options.includes(value);
  const otherChecked =
    Boolean(allowOther) && !isPreset && (otherActive || Boolean(value));

  const row = "flex min-h-11 items-center gap-3 type-body text-heading";
  const radio = "size-5 shrink-0 accent-primary";

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="flex flex-col">
      {options.map((option) => (
        <label key={option} className={cn(row, "cursor-pointer")}>
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={() => {
              setOtherActive(false);
              onChange(option);
            }}
            className={radio}
          />
          {option}
        </label>
      ))}
      {allowOther && (
        <div className={row}>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="radio"
              name={name}
              checked={otherChecked}
              onChange={() => {
                setOtherActive(true);
                onChange("");
                otherInput.current?.focus();
              }}
              className={radio}
            />
            {otherLabel}:
          </label>
          <input
            ref={otherInput}
            type="text"
            aria-label={`${otherLabel} answer`}
            placeholder={otherPlaceholder}
            value={otherChecked ? (value ?? "") : ""}
            onFocus={() => {
              if (!otherChecked) {
                setOtherActive(true);
                onChange("");
              }
            }}
            onChange={(e) => {
              setOtherActive(true);
              onChange(e.target.value);
            }}
            className="min-w-0 flex-1 border-b border-input bg-transparent py-1 type-body outline-none placeholder:text-body-muted focus-visible:border-ring"
          />
        </div>
      )}
    </div>
  );
}

/** Dropdown for short fixed lists (Exposure, Event, Event Year). */
export function SelectInput({
  id,
  value,
  onChange,
  options,
  placeholder,
  invalid,
  describedBy,
}: ControlProps & {
  value: string | null;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (typeof next === "string") onChange(next);
      }}
    >
      <SelectTrigger
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="w-full px-3 data-[size=default]:h-11"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Date field. Uses the browser's date input (best picker on phones) with the
 * Figma calendar icon and "Select a date" hint. Value is YYYY-MM-DD.
 */
export function DateInput({
  id,
  value,
  onChange,
  invalid,
  describedBy,
}: ControlProps & { value: string; onChange: (value: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="relative">
      <Input
        ref={input}
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          "h-11 px-3 pr-11 [&::-webkit-calendar-picker-indicator]:hidden",
          !value && "text-transparent",
        )}
      />
      {!value && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center type-body text-body-muted"
        >
          Select a date
        </span>
      )}
      <button
        type="button"
        aria-label="Open calendar"
        onClick={() => input.current?.showPicker?.()}
        className="absolute inset-y-0 right-1 flex w-10 items-center justify-center rounded-input text-icon-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <CalendarIcon aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}
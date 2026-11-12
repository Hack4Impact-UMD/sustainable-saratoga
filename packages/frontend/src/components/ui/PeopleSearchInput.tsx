import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { Search, X } from "lucide-react";
import { cn } from "cn";

interface PeopleSearchInputProps extends React.ComponentProps<"input"> {
  onClear?: () => void;
}

const PeopleSearchInput = React.forwardRef<
  HTMLInputElement,
  PeopleSearchInputProps
>(function PeopleSearchInput({ className, onClear, ...props }, ref) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uncontrolledValue, setUncontrolledValue] = React.useState(() =>
    String(props.defaultValue ?? ""),
  );
  const hasValue =
    typeof props.value === "string"
      ? props.value.length > 0
      : uncontrolledValue.length > 0;

  React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setUncontrolledValue(event.target.value);
    props.onChange?.(event);
  }

  return (
    <div
      data-slot="people-search-input"
      className={cn(
        "flex h-12 w-full min-w-0 pl-4 pr-1.5 gap-2 items-center rounded-pill bg-surface text-body-muted border border-line focus-within:border-primary focus-within:border-2",
        className,
      )}
    >
      <Search aria-hidden="true" className="size-5 shrink-0" />

      <InputPrimitive
        {...props}
        ref={inputRef}
        type="search"
        data-slot="input"
        onChange={handleChange}
        className="h-full min-w-0 w-full border-0 text-base outline-none placeholder:text-body-muted focus-visible:border-0 focus-visible:ring-0 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none md:text-sm"
      />
      {hasValue && (
        <button
          type="button"
          aria-label="Clear search"
          className="grid size-11 shrink-0 place-items-center rounded-pill text-icon-primary"
          onClick={() => {
            onClear?.();
            inputRef.current?.focus();
          }}
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      )}
    </div>
  );
});

export { PeopleSearchInput };

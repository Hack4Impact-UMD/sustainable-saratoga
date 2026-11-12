import * as React from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { cn } from "cn";

interface ToastProps extends Omit<
  React.ComponentProps<"div">,
  "role" | "children"
> {
  message: React.ReactNode;
  variant?: "success" | "error";
  onClose?: () => void;
  duration?: number;
}

/**
 * Announces a short-lived success or error message to assistive technology.
 * Toasts without a close action dismiss themselves after four seconds.
 */
function Toast({
  className,
  message,
  variant = "success",
  onClose,
  duration = 4000,
  ...props
}: ToastProps) {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    if (onClose) return;

    const timeout = window.setTimeout(() => {
      setVisible(false);
    }, duration);

    return () => window.clearTimeout(timeout);
  }, [duration, onClose]);

  if (!visible) return null;

  const isError = variant === "error";

  return (
    <div
      {...props}
      role={isError ? "alert" : "status"}
      aria-atomic="true"
      className={cn(
        "pointer-events-auto fixed inset-x-4 bottom-4 z-50 mx-auto flex min-h-16 w-full max-w-sm items-center gap-3 rounded-input bg-body px-4 py-3 text-on-primary shadow-2",
        className,
      )}
    >
      {isError ? (
        <AlertCircle
          aria-hidden="true"
          className="size-5 shrink-0 text-error"
        />
      ) : (
        <CheckCircle2
          aria-hidden="true"
          className="size-5 shrink-0 text-accent"
        />
      )}
      <p className="type-body-strong min-w-0 flex-1 text-on-primary">
        {message}
      </p>
      {onClose && (
        <button
          type="button"
          aria-label="Close notification"
          className="grid size-11 shrink-0 place-items-center rounded-pill text-on-primary hover:bg-hover/20"
          onClick={onClose}
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      )}
    </div>
  );
}

export { Toast };

import { CircleAlert, CircleCheck } from "lucide-react";
import { toast } from "sonner";

/** Shows a short dark toast at the bottom of the screen (the `Toaster` in main.tsx). */
export function notify(variant: "success" | "error", message: string) {
  const options = {
    duration: 4000,
    unstyled: true,
    className:
      "flex w-[min(27rem,calc(100vw-2rem))] items-center gap-4 rounded-md border-0 bg-heading px-5 py-4 text-on-primary shadow-2",
    classNames: { title: "type-body-strong !text-on-primary" },
  };

  if (variant === "success") {
    toast.success(message, {
      ...options,
      icon: <CircleCheck className="size-6 shrink-0 text-line-success" />,
    });
  } else {
    toast.error(message, {
      ...options,
      icon: <CircleAlert className="size-6 shrink-0 text-line-error" />,
    });
  }
}

import type * as React from "react";
import { cn } from "../../lib/utils";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "green" | "red" | "yellow";
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variant === "default" && "bg-tn-panel-2 text-tn-text",
        variant === "green" && "bg-tn-green/20 text-tn-green",
        variant === "red" && "bg-tn-red/20 text-tn-red",
        variant === "yellow" && "bg-tn-yellow/20 text-tn-yellow",
        className,
      )}
      {...props}
    />
  );
}

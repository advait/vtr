import type * as React from "react";
import { cn } from "../../lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost";
  size?: "sm" | "md";
};

export function Button({ className, variant = "default", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tn-accent",
        variant === "default" && "bg-tn-accent text-tn-bg hover:bg-tn-cyan active:bg-tn-cyan/80",
        variant === "ghost" && "bg-transparent text-tn-text hover:bg-tn-panel-2",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        className,
      )}
      {...props}
    />
  );
}

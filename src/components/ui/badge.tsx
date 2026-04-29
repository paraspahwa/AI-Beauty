import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "default" | "accent" | "success" | "danger";
}

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  const tones: Record<NonNullable<BadgeProps["tone"]>, string> = {
    default: "bg-cream-200 text-ink-stone",
    accent:  "bg-accent/15 text-accent-deep",
    success: "bg-green-100 text-green-800",
    danger:  "bg-red-100 text-red-800",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

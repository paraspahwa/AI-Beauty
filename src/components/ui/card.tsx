import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-cream-200 bg-white/70 backdrop-blur-sm shadow-card",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6 pb-2", className)} {...p} />
);
export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("font-serif text-2xl text-ink", className)} {...p} />
);
export const CardDescription = ({ className, ...p }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-ink-muted mt-1", className)} {...p} />
);
export const CardContent = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6 pt-4", className)} {...p} />
);

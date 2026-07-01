import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  label: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ label, title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-10 rounded-[2rem] border border-terracotta/15 bg-[var(--color-surface)]/90 p-5 shadow-card backdrop-blur-sm sm:p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <span className="foil-label mb-3 inline-flex">{label}</span>
          <h1 className="font-display text-3xl text-ink sm:text-4xl">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-ink-stone leading-relaxed">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

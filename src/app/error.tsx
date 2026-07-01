"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[var(--color-background)] p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="error-banner mx-auto flex h-16 w-16 items-center justify-center rounded-full">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-2xl text-ink">Something went wrong</h1>
          <p className="text-sm text-ink-stone leading-relaxed">
            An unexpected error occurred. This has been logged and we&apos;ll look into it.
          </p>
          {error.digest && (
            <p className="inline-block rounded px-2 py-1 font-mono text-xs text-ink-mist bg-blush border border-[var(--color-border)]">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset} variant="accent" className="cta-shimmer">
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              <Home className="h-4 w-4" />
              Go home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

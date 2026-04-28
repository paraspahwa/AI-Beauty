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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-cream">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 border border-red-100">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-2xl text-ink">Something went wrong</h1>
          <p className="text-ink-stone text-sm leading-relaxed">
            An unexpected error occurred. This has been logged and we&apos;ll look into it.
          </p>
          {error.digest && (
            <p className="text-xs text-ink-mist font-mono bg-cream-100 rounded px-2 py-1 inline-block">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="accent">
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

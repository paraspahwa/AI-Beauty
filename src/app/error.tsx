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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6" style={{ background: "linear-gradient(145deg, #0A0A0F 0%, #12121A 100%)" }}>
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}>
          <AlertTriangle className="h-8 w-8" style={{ color: "#F87171" }} />
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-2xl text-ink">Something went wrong</h1>
          <p className="text-ink-stone text-sm leading-relaxed">
            An unexpected error occurred. This has been logged and we&apos;ll look into it.
          </p>
          {error.digest && (
            <p className="text-xs text-ink-mist font-mono rounded px-2 py-1 inline-block" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
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

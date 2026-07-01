import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[var(--color-background)] p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="relative">
          <p className="select-none font-display text-[120px] font-bold leading-none text-blush">
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-espresso text-[var(--btn-fg)] shadow-glow cta-glow">
              <Sparkles className="h-10 w-10" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="font-display text-3xl text-ink">Page not found</h1>
          <p className="text-ink-stone leading-relaxed">
            Looks like this page has gone off-trend. Let&apos;s get you back to discovering your
            perfect style.
          </p>
        </div>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="accent" className="cta-shimmer">
            <Link href="/">
              <Home className="h-4 w-4" />
              Go home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/upload">
              <ArrowLeft className="h-4 w-4" />
              Start analysis
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

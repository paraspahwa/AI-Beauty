import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-gradient-to-br from-cream to-cream-100">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Decorative number */}
        <div className="relative">
          <p className="font-serif text-[120px] leading-none text-ink/5 select-none font-bold">
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-terracotta to-camel text-white shadow-premium">
              <Sparkles className="h-10 w-10" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="font-serif text-3xl text-ink">Page not found</h1>
          <p className="text-ink-stone leading-relaxed">
            Looks like this page has gone off-trend. Let&apos;s get you back to discovering your
            perfect style.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="accent">
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

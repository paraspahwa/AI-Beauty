"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Mail } from "lucide-react";

export default function AuthPage() {
  return (
    <React.Suspense fallback={<main className="container max-w-md py-20" />}>
      <AuthForm />
    </React.Suspense>
  );
}

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") ?? "/upload";
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}${redirectTo}` },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container max-w-md py-20">
      <Card>
        <CardHeader>
          <CardTitle>Sign in to StyleAI</CardTitle>
          <CardDescription>
            We&apos;ll email you a magic link — no passwords needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="rounded-2xl bg-cream-100 p-4 text-center text-sm text-ink-soft">
              <Mail className="mx-auto mb-2 h-5 w-5 text-accent-deep" />
              Check <b>{email}</b> for your sign-in link.
            </div>
          ) : (
            <form onSubmit={sendLink} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-full border border-cream-300 bg-white/80 px-4 py-3 text-sm focus:border-accent focus:outline-none"
              />
              {error && <p className="text-xs text-danger">{error}</p>}
              <Button type="submit" variant="accent" className="w-full" disabled={loading}>
                {loading ? "Sending…" : "Send magic link"}
              </Button>
            </form>
          )}
          <button
            onClick={() => router.push("/")}
            className="mt-4 block w-full text-center text-xs text-ink-muted hover:text-ink"
          >
            Back to home
          </button>
        </CardContent>
      </Card>
    </main>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Archive, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VaultGallery } from "@/components/vault/VaultGallery";
import styles from "../dashboard/dashboard.module.css";

export const metadata = {
  title: "Vault — Renovaara",
  description: "Your uploads, analysis infographics, and downloadable beauty reports.",
};

export default async function VaultPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth?redirect=/vault");

  return (
    <main className={`min-h-app-viewport ${styles.pageBase}`}>
      <div className="page-bleed-x py-10 sm:py-16">
        <div className="mx-auto w-full max-w-7xl">
          <div className={`mb-10 rounded-[2rem] border p-5 sm:p-6 ${styles.heroCard}`}>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <span className="section-label mb-3 inline-flex">
                  <Archive className="h-3.5 w-3.5 mr-1.5" />
                  Vault
                </span>
                <h1 className="font-sans text-3xl sm:text-4xl text-ink mb-2">Your beauty archive</h1>
                <p className="text-ink-stone max-w-2xl">
                  Every photo you uploaded and every analysis we generated — download, share, or delete individual items anytime.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard">
                    <FileText className="h-4 w-4" />
                    Reports
                  </Link>
                </Button>
                <Button asChild variant="accent" size="sm">
                  <Link href="/upload">New analysis</Link>
                </Button>
              </div>
            </div>
          </div>

          <VaultGallery />
        </div>
      </div>
    </main>
  );
}

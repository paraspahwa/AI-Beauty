import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VaultGallery } from "@/components/vault/VaultGallery";
import { PageHeader } from "@/components/layout/PageHeader";
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
          <PageHeader
            label="Vault"
            title="Your beauty archive"
            description="Every photo you uploaded and every analysis we generated — download, share, or delete individual items anytime."
            actions={
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard">
                    <FileText className="h-4 w-4" />
                    Reports
                  </Link>
                </Button>
                <Button asChild variant="accent" size="sm">
                  <Link href="/upload">New analysis</Link>
                </Button>
              </>
            }
          />

          <VaultGallery />
        </div>
      </div>
    </main>
  );
}

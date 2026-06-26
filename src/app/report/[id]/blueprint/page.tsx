import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { hasPremiumAccess } from "@/lib/auth/access";
import { enrichReportStudioEntitlement, getStudioEntitlement } from "@/lib/entitlement";
import { BlueprintGallery } from "@/components/report/BlueprintGallery";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Beauty Blueprint — Renovaara" };
}

export default async function BlueprintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?redirect=/report/${id}/blueprint`);

  const admin = createSupabaseAdminClient();
  const [{ data: row }, baseEntitlement] = await Promise.all([
    supabase
      .from("reports")
      .select("id, user_id, status, is_paid, color_analysis, face_shape")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    getStudioEntitlement(user.id),
  ]);

  if (!row) notFound();

  const hasPremium = hasPremiumAccess({ isPaid: !!row.is_paid, userEmail: user.email });
  const effectivePremium = hasPremium || baseEntitlement.tier === "studio_pro";
  await enrichReportStudioEntitlement(admin, user.id, id, !!row.is_paid, baseEntitlement);

  const season = (row.color_analysis as { season?: string } | null)?.season;
  const headerTitle = season
    ? `Your ${season} Beauty Blueprint`
    : "Your Beauty Blueprint";

  return (
    <BlueprintGallery
      reportId={id}
      isPaid={effectivePremium}
      reportStatus={row.status}
      headerTitle={headerTitle}
    />
  );
}

import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { ReportLayout } from "@/components/report/ReportLayout";
import type { CompiledReport } from "@/types/report";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?redirect=/report/${id}`);

  const { data: row } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!row) notFound();

  const admin = createSupabaseAdminClient();
  const { data: signed } = await admin.storage
    .from(env.supabase.bucket)
    .createSignedUrl(row.image_path, 60 * 30);

  const isPaid = !!row.is_paid;
  const report: CompiledReport = {
    id: row.id,
    userId: row.user_id,
    imageUrl: signed?.signedUrl ?? "",
    status: row.status,
    isPaid,
    faceShape: row.face_shape ?? undefined,
    colorAnalysis: row.color_analysis ?? undefined,
    skinAnalysis: isPaid ? row.skin_analysis ?? undefined : undefined,
    features:     isPaid ? row.features      ?? undefined : undefined,
    glasses:      isPaid ? row.glasses       ?? undefined : undefined,
    hairstyle:    isPaid ? row.hairstyle     ?? undefined : undefined,
    summary:      row.summary ?? undefined,
    createdAt:    row.created_at,
  };

  return <ReportLayout report={report} />;
}

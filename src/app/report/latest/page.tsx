import { redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * /report/latest — sends signed-in users to their most recent report.
 * Avoids dead-end navigation when users click "Get my report".
 */
export default async function LatestReportPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth?redirect=/report/latest");

  const admin = createSupabaseAdminClient();
  const { data: row } = await admin
    .from("reports")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row?.id) redirect("/upload");

  redirect(`/report/${row.id}`);
}

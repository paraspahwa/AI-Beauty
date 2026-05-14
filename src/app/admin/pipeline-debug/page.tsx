import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUserEmail } from "@/lib/auth/access";
import { PipelineDebugClient } from "./PipelineDebugClient";

export default async function PipelineDebugPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminUserEmail(user.email)) redirect("/");

  return <PipelineDebugClient userEmail={user.email ?? ""} />;
}

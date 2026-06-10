import { redirect } from "next/navigation";

/** Legacy route — consolidated into My Looks. */
export default function VaultRedirectPage() {
  redirect("/dashboard/studio-vault");
}

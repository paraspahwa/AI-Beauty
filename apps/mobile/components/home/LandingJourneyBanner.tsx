import { getLandingJourneyHint } from "@web/lib/report/journey-hints";
import { NextStepHint } from "@/components/ui/NextStepHint";
import { useJourneySnapshot } from "@/hooks/use-journey-snapshot";
import { useRouter } from "expo-router";

export function LandingJourneyBanner() {
  const router = useRouter();
  const snapshot = useJourneySnapshot();
  if (snapshot.loading || !snapshot.authenticated) return null;

  const hint = getLandingJourneyHint(snapshot);
  if (!hint) return null;

  return (
    <NextStepHint
      hint={hint}
      onAction={() => {
        if (hint.href?.includes("/upload")) router.push("/upload");
        else if (snapshot.latestReport) router.push(`/report/${snapshot.latestReport.id}`);
      }}
      style={{ marginBottom: 16 }}
    />
  );
}

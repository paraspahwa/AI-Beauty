import { fetchReport } from "@/lib/api";

type PollResult = {
  id: string;
  status: "processing" | "ready" | "failed";
  error?: string | null;
};

export async function pollReportUntilReady(reportId: string): Promise<PollResult> {
  const maxAttempts = 30;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await fetchReport(reportId);

    if (result.status === "pending") {
      continue;
    }

    if (result.status === "ready" || result.status === "failed") {
      return {
        id: result.id,
        status: result.status,
        error: result.error,
      };
    }

    const waitMs = Math.min(2000 + attempt * 500, 8000);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  throw new Error("Timed out while waiting for analysis to finish");
}

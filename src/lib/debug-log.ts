/** Debug-mode NDJSON logging (session 0dc1d3). Remove after verification. */
export function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId = "pre-fix",
): void {
  // #region agent log
  fetch("http://127.0.0.1:7365/ingest/7666977d-9746-4afe-91bd-f61f1ea1abe3", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "0dc1d3",
    },
    body: JSON.stringify({
      sessionId: "0dc1d3",
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

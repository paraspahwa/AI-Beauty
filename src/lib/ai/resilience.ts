export type StageErrorKind =
  | "timeout"
  | "rate_limit"
  | "provider"
  | "parse"
  | "validation"
  | "unknown";

export class PipelineStageError extends Error {
  stage: string;
  kind: StageErrorKind;

  constructor(stage: string, kind: StageErrorKind, message: string) {
    super(message);
    this.name = "PipelineStageError";
    this.stage = stage;
    this.kind = kind;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function classifyStageError(err: unknown): StageErrorKind {
  const message = asMessage(err).toLowerCase();
  if (message.includes("timeout") || message.includes("timed out") || message.includes("aborted")) {
    return "timeout";
  }
  if (message.includes("429") || message.includes("rate limit") || message.includes("too many requests")) {
    return "rate_limit";
  }
  if (message.includes("parse") || message.includes("json")) {
    return "parse";
  }
  if (message.includes("validation") || message.includes("invalid")) {
    return "validation";
  }
  if (
    message.includes("openai") ||
    message.includes("rekognition") ||
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("service unavailable")
  ) {
    return "provider";
  }
  return "unknown";
}

function isRetryable(kind: StageErrorKind): boolean {
  return kind === "timeout" || kind === "rate_limit" || kind === "provider";
}

export async function withRetry<T>(
  stage: string,
  fn: () => Promise<T>,
  maxAttempts = 2,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const kind = classifyStageError(err);
      const retry = isRetryable(kind) && attempt < maxAttempts;
      console.warn(`[pipeline:${stage}] attempt ${attempt}/${maxAttempts} failed (${kind})`);
      if (!retry) break;
      await sleep(250 * attempt);
    }
  }

  const kind = classifyStageError(lastError);
  const message = asMessage(lastError);
  throw new PipelineStageError(stage, kind, message);
}

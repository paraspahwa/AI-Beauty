/** Normalize API / thrown errors into user-readable strings (avoids "[object Object]"). */

export function formatApiError(value: unknown, fallback = "Something went wrong. Please try again."): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value instanceof Error && value.message.trim()) return value.message.trim();
  if (!value || typeof value !== "object") return fallback;

  const record = value as Record<string, unknown>;
  if (typeof record.message === "string" && record.message.trim()) return record.message.trim();
  if (typeof record.error === "string" && record.error.trim()) return record.error.trim();
  if (typeof record.detail === "string" && record.detail.trim()) return record.detail.trim();

  if (Array.isArray(record.detail)) {
    const parts = record.detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg: unknown }).msg);
        }
        return null;
      })
      .filter(Boolean);
    if (parts.length) return parts.join("; ");
  }

  if (record.body && typeof record.body === "object") {
    return formatApiError(record.body, fallback);
  }

  return fallback;
}

export function errorMessageFromUnknown(err: unknown, fallback = "Something went wrong. Please try again."): string {
  return formatApiError(err, fallback);
}

type FalImageOutput = {
  data?: { image?: { url?: string }; images?: { url: string }[] };
  image?: { url?: string };
  images?: { url: string }[];
};

export function extractFalImageUrl(result: FalImageOutput): string {
  return (
    result.data?.images?.[0]?.url
    ?? result.data?.image?.url
    ?? result.images?.[0]?.url
    ?? result.image?.url
    ?? ""
  );
}

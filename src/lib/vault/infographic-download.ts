/** Filename for a saved infographic (matches Vault naming). */
export function buildInfographicDownloadName(
  sectionKey: string,
  mime?: string,
  createdAt?: string,
): string {
  const ext = mime?.includes("png") ? "png" : mime?.includes("webp") ? "webp" : "jpg";
  const date = createdAt
    ? new Date(createdAt).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  return `Renovaara-${sectionKey}-${date}.${ext}`;
}

export async function downloadInfographicImage(
  signedUrl: string,
  downloadName: string,
): Promise<void> {
  const res = await fetch(signedUrl);
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export interface SocialShareTarget {
  id: string;
  label: string;
  /** Opens in new window */
  buildUrl: (params: { url: string; title: string; text: string; imageUrl?: string }) => string | null;
}

function enc(value: string): string {
  return encodeURIComponent(value);
}

export const SOCIAL_SHARE_TARGETS: SocialShareTarget[] = [
  {
    id: "facebook",
    label: "Facebook",
    buildUrl: ({ url }) => `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
  },
  {
    id: "x",
    label: "X (Twitter)",
    buildUrl: ({ url, text }) => `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    buildUrl: ({ url }) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
  },
  {
    id: "pinterest",
    label: "Pinterest",
    buildUrl: ({ url, text, imageUrl }) => {
      const base = `https://pinterest.com/pin/create/button/?url=${enc(url)}&description=${enc(text)}`;
      return imageUrl ? `${base}&media=${enc(imageUrl)}` : base;
    },
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    buildUrl: ({ url, text }) => `https://wa.me/?text=${enc(`${text} ${url}`)}`,
  },
  {
    id: "telegram",
    label: "Telegram",
    buildUrl: ({ url, text }) => `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`,
  },
  {
    id: "reddit",
    label: "Reddit",
    buildUrl: ({ url, title }) => `https://reddit.com/submit?url=${enc(url)}&title=${enc(title)}`,
  },
  {
    id: "threads",
    label: "Threads",
    buildUrl: ({ url, text }) => `https://www.threads.net/intent/post?text=${enc(`${text} ${url}`)}`,
  },
  {
    id: "bluesky",
    label: "Bluesky",
    buildUrl: ({ url, text }) => `https://bsky.app/intent/compose?text=${enc(`${text} ${url}`)}`,
  },
  {
    id: "email",
    label: "Email",
    buildUrl: ({ url, title, text }) =>
      `mailto:?subject=${enc(title)}&body=${enc(`${text}\n\n${url}`)}`,
  },
  {
    id: "sms",
    label: "SMS",
    buildUrl: ({ url, text }) => `sms:?body=${enc(`${text} ${url}`)}`,
  },
];

export function canUseNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function downloadVaultAsset(item: {
  signedUrl?: string;
  downloadName: string;
  kind: string;
  reportUrl: string;
  pdfDownloadUrl?: string;
}): Promise<void> {
  if (item.kind === "pdf") {
    const href = item.pdfDownloadUrl ?? item.reportUrl;
    const res = await fetch(href, { credentials: "include" });
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = item.downloadName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
    return;
  }

  if (!item.signedUrl) throw new Error("Download unavailable");

  const res = await fetch(item.signedUrl);
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = item.downloadName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function nativeShareVaultItem(item: {
  shareTitle: string;
  shareText: string;
  reportUrl: string;
  signedUrl?: string;
  downloadName: string;
  kind: string;
}): Promise<boolean> {
  if (!canUseNativeShare()) return false;

  const payload: ShareData = {
    title: item.shareTitle,
    text: item.shareText,
    url: item.reportUrl,
  };

  if (item.kind !== "pdf" && item.signedUrl && typeof File !== "undefined") {
    try {
      const res = await fetch(item.signedUrl);
      const blob = await res.blob();
      const file = new File([blob], item.downloadName, { type: blob.type || "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ ...payload, files: [file] });
        return true;
      }
    } catch {
      // Fall through to URL-only share
    }
  }

  await navigator.share(payload);
  return true;
}

export async function copyVaultLink(url: string): Promise<void> {
  await navigator.clipboard.writeText(url);
}

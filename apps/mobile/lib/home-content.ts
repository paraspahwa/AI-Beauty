import homeContent from "@web/content/home-content.json";

export type HomeContent = typeof homeContent;

export function getHomeContent(): HomeContent {
  return homeContent;
}

export function getSampleImageUrl(apiBaseUrl: string, imageFile: string): string {
  const base = apiBaseUrl.replace(/\/$/, "");
  return `${base}/samples/${imageFile}`;
}

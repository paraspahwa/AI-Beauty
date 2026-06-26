import { zipSync } from "fflate";

const SECTION_FILE_NAMES: Record<string, string> = {
  faceFeatures: "01-face-features.jpg",
  skin: "02-skin-analysis.jpg",
  color: "03-color-analysis.jpg",
  hairstyle: "04-hairstyle-guide.jpg",
  spectacles: "05-spectacles-guide.jpg",
  hairColor: "06-hair-color-report.jpg",
  styleGuide: "07-style-guide.jpg",
};

/**
 * Build a ZIP archive from named file buffers (store compression).
 */
export function buildZipArchive(files: { name: string; data: Uint8Array }[]): Buffer {
  const entries: Record<string, Uint8Array> = {};
  for (const file of files) {
    entries[file.name] = file.data;
  }
  const zipped = zipSync(entries, { level: 0 });
  return Buffer.from(zipped);
}

export function infographicZipFileName(sectionId: string): string {
  return SECTION_FILE_NAMES[sectionId] ?? `${sectionId}.jpg`;
}

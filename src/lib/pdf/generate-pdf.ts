import { env } from "@/lib/env";
import { renderInfographicPdfHtml } from "@/lib/pdf/render-pdf-html";
import type { InfographicSlide } from "@/lib/pdf/infographic-slides";
import type { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function loadSlideDataUrls(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  bucket: string,
  slides: InfographicSlide[],
): Promise<Array<InfographicSlide & { dataUrl: string }>> {
  const loaded: Array<InfographicSlide & { dataUrl: string }> = [];

  for (const slide of slides) {
    const { data, error } = await admin.storage.from(bucket).download(slide.storagePath);
    if (error || !data) continue;
    const buffer = Buffer.from(await data.arrayBuffer());
    const mime = slide.storagePath.endsWith(".png") ? "image/png" : "image/jpeg";
    loaded.push({
      ...slide,
      dataUrl: `data:${mime};base64,${buffer.toString("base64")}`,
    });
  }

  return loaded;
}

export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const chromium = await import("@sparticuz/chromium-min");
  const puppeteer = await import("puppeteer-core");

  const executablePath = await chromium.default.executablePath(
    process.env.CHROMIUM_EXECUTABLE_PATH ??
      "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar",
  );

  const browser = await puppeteer.default.launch({
    args: chromium.default.args,
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600 });
    await page.setContent(html, { waitUntil: "load", timeout: 60_000 });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      preferCSSPageSize: true,
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

export interface BuildInfographicPdfInput {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  reportId: string;
  createdAt: string;
  slides: InfographicSlide[];
  title: string;
  subtitle: string;
}

export async function buildInfographicPdf(input: BuildInfographicPdfInput): Promise<Buffer | null> {
  const bucket = env.supabase.bucket;
  const slidesWithData = await loadSlideDataUrls(input.admin, bucket, input.slides);
  if (slidesWithData.length === 0) return null;

  const html = renderInfographicPdfHtml({
    title: input.title,
    subtitle: input.subtitle,
    reportId: input.reportId,
    createdAt: input.createdAt,
    slides: slidesWithData,
  });

  return htmlToPdfBuffer(html);
}

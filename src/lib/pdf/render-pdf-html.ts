import type { InfographicSlide } from "@/lib/pdf/infographic-slides";

function esc(s: string): string {
  return s.replace(/[<>&"'`]/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;", "`": "&#96;",
  }[c]!));
}

export interface RenderPdfHtmlInput {
  title: string;
  subtitle: string;
  reportId: string;
  createdAt: string;
  slides: Array<InfographicSlide & { dataUrl: string }>;
}

export function renderInfographicPdfHtml(input: RenderPdfHtmlInput): string {
  const dateLabel = new Date(input.createdAt).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const pages = input.slides
    .map(
      (slide) => `
    <section class="page">
      <p class="page-label">${esc(slide.label)}</p>
      <div class="image-frame">
        <img src="${slide.dataUrl}" alt="${esc(slide.label)}" />
      </div>
    </section>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${esc(input.title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, "Times New Roman", serif;
      background: #F5F0EA;
      color: #2C1A10;
    }
    .cover {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 48px 32px;
      page-break-after: always;
    }
    .cover h1 {
      font-size: 32px;
      letter-spacing: 0.06em;
      color: #111827;
      margin-bottom: 12px;
    }
    .cover p {
      font-size: 14px;
      color: #6B5344;
      line-height: 1.6;
    }
    .cover .brand {
      margin-top: 32px;
      font-size: 11px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #9C7D5B;
    }
    .page {
      min-height: 100vh;
      padding: 16mm 12mm 20mm;
      page-break-after: always;
      display: flex;
      flex-direction: column;
    }
    .page:last-child { page-break-after: auto; }
    .page-label {
      font-size: 11px;
      font-family: system-ui, sans-serif;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #9C7D5B;
      margin-bottom: 8px;
      text-align: center;
    }
    .image-frame {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0;
    }
    .image-frame img {
      max-width: 100%;
      max-height: 255mm;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(17, 24, 39, 0.12);
    }
    @media print {
      body { background: #fff; }
      .page { padding: 10mm 8mm 14mm; }
    }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${esc(input.title)}</h1>
    <p>${esc(input.subtitle)}</p>
    <p style="margin-top:16px">${esc(dateLabel)}</p>
    <p class="brand">Renovaara · renovaara.in</p>
  </div>
  ${pages}
</body>
</html>`;
}

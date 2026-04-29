import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type {
  ColorAnalysisResult,
  FaceShapeResult,
  FeatureBreakdown,
  GlassesResult,
  HairstyleResult,
  SkinAnalysisResult,
} from "@/types/report";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/reports/[id]/pdf
 * Returns a print-ready HTML page the user can save as PDF via the browser print dialog.
 * The response uses Content-Disposition: attachment so it downloads directly.
 *
 * Note: Full server-side PDF generation (puppeteer / @sparticuz/chromium) can be layered
 * in later without changing the public API — just swap the Response body.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!env.flags.pdfEnabled) {
    return NextResponse.json({ error: "PDF disabled" }, { status: 403 });
  }
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: row } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!row || !row.is_paid) {
    return NextResponse.json({ error: "Locked" }, { status: 403 });
  }

  const html = renderHtml(row);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // attachment + nosniff prevents the browser from rendering this as an active page
      "Content-Disposition": `attachment; filename="styleai-report-${row.id}.html"`,
      "X-Content-Type-Options": "nosniff",
      // Tight CSP: no scripts, no external resources — it's a print document
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none';",
      "X-Frame-Options": "DENY",
    },
  });
}

type ReportRow = {
  id: string;
  created_at: string;
  face_shape?: FaceShapeResult | null;
  color_analysis?: ColorAnalysisResult | null;
  skin_analysis?: SkinAnalysisResult | null;
  features?: FeatureBreakdown | null;
  glasses?: GlassesResult | null;
  hairstyle?: HairstyleResult | null;
  summary?: string | null;
};

function esc(s: string): string {
  return s.replace(/[<>&"'`]/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;", "`": "&#96;",
  }[c]!));
}

/** Validate and sanitize a hex color string. Returns a safe fallback if invalid. */
function safeHex(hex: string, fallback = "#888888"): string {
  return /^#[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{3})?$/.test(hex) ? hex : fallback;
}

function section(title: string, body: string): string {
  return `<section><h2>${esc(title)}</h2>${body}</section>`;
}

function pill(text: string, bg = "#C17A5F", color = "#fff"): string {
  return `<span class="pill" style="background:${safeHex(bg)};color:${safeHex(color, "#ffffff")}">${esc(text)}</span>`;
}

function swatch(hex: string, name: string): string {
  return `<span class="swatch-wrap"><span class="swatch" style="background:${safeHex(hex)}"></span>${esc(name)}</span>`;
}

function renderHtml(r: ReportRow): string {
  const parts: string[] = [];

  if (r.face_shape) {
    const fs = r.face_shape;
    parts.push(section("Face Shape", `
      <p><strong>Shape:</strong> ${esc(fs.shape)} &nbsp; <em>Confidence: ${Math.round(fs.confidence * 100)}%</em></p>
      <p><strong>Traits:</strong> ${fs.traits.map((t) => pill(t, "#8B6F5E")).join(" ")}</p>
    `));
  }

  if (r.color_analysis) {
    const ca = r.color_analysis;
    parts.push(section("Colour Analysis", `
      <p><strong>Season:</strong> ${esc(ca.season)} &nbsp; <strong>Undertone:</strong> ${esc(ca.undertone)}</p>
      <p>${esc(ca.description)}</p>
      <p><strong>Your palette:</strong><br>${ca.palette.map((c) => swatch(c.hex, c.name)).join(" ")}</p>
      <p><strong>Best metals:</strong> ${ca.metals.map((m) => pill(m, "#A89070")).join(" ")}</p>
      ${ca.avoidColors.length ? `<p><strong>Avoid:</strong><br>${ca.avoidColors.map((c) => swatch(c.hex, c.name)).join(" ")}</p>` : ""}
    `));
  }

  if (r.skin_analysis) {
    const sa = r.skin_analysis;
    parts.push(section("Skin Analysis", `
      <p><strong>Type:</strong> ${esc(sa.type)}</p>
      ${sa.concerns.length ? `<p><strong>Concerns:</strong> ${sa.concerns.map((c) => pill(c, "#9A8070")).join(" ")}</p>` : ""}
      ${sa.zones.length ? `<table><tr><th>Zone</th><th>Observation</th></tr>${sa.zones.map((z) => `<tr><td>${esc(z.zone)}</td><td>${esc(z.observation)}</td></tr>`).join("")}</table>` : ""}
      ${sa.routine.length ? `<h3>Routine</h3><ol>${sa.routine.map((s) => `<li><strong>${esc(s.step)}:</strong> ${esc(s.product)}</li>`).join("")}</ol>` : ""}
    `));
  }

  if (r.features) {
    const f = r.features;
    const rows = (["eyes", "nose", "lips", "cheeks"] as const).map((k) =>
      `<tr><td><strong>${k.charAt(0).toUpperCase() + k.slice(1)}</strong></td><td>${esc(f[k].shape)}</td><td>${esc(f[k].notes)}</td></tr>`
    );
    parts.push(section("Facial Features", `
      <table><tr><th>Feature</th><th>Shape</th><th>Notes</th></tr>${rows.join("")}</table>
    `));
  }

  if (r.glasses) {
    const g = r.glasses;
    parts.push(section("Spectacles Guide", `
      ${g.goals.length ? `<p><strong>Goals:</strong> ${g.goals.map((x) => pill(x, "#6E8C7A", "#fff")).join(" ")}</p>` : ""}
      ${g.recommended.length ? `<h3>Recommended Styles</h3><ul>${g.recommended.map((s) => `<li><strong>${esc(s.style)}:</strong> ${esc(s.reason)}</li>`).join("")}</ul>` : ""}
      ${g.avoid.length ? `<h3>Styles to Avoid</h3><ul>${g.avoid.map((s) => `<li><strong>${esc(s.style)}:</strong> ${esc(s.reason)}</li>`).join("")}</ul>` : ""}
      ${g.colors.length ? `<p><strong>Frame colours:</strong><br>${g.colors.map((c) => swatch(c.hex, c.name)).join(" ")}</p>` : ""}
      ${g.fitTips.length ? `<h3>Fit Tips</h3><ul>${g.fitTips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
    `));
  }

  if (r.hairstyle) {
    const h = r.hairstyle;
    parts.push(section("Hairstyle Guide", `
      ${h.styles.length ? `<h3>Recommended Styles</h3><ul>${h.styles.map((s) => `<li><strong>${esc(s.name)}:</strong> ${esc(s.description)}</li>`).join("")}</ul>` : ""}
      ${h.lengths.length ? `<h3>Lengths</h3><ul>${h.lengths.map((l) => `<li><strong>${esc(l.name)}:</strong> ${esc(l.description)}</li>`).join("")}</ul>` : ""}
      ${h.colors.length ? `<h3>Hair Colours</h3><p>${h.colors.map((c) => swatch(c.hex, c.name)).join(" ")}</p>` : ""}
      ${h.avoid.length ? `<h3>Avoid</h3><ul>${h.avoid.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
    `));
  }

  if (r.summary) {
    parts.push(section("Summary", `<p class="summary">${esc(r.summary)}</p>`));
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>StyleAI Report — ${r.id.slice(0, 8)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Georgia,serif;background:#FAF7F2;color:#2A1F14;padding:40px 48px;max-width:900px;margin:0 auto}
    header{text-align:center;padding-bottom:32px;border-bottom:1px solid #E8DDD0;margin-bottom:32px}
    header h1{font-size:28px;letter-spacing:.05em;color:#C17A5F}
    header p{margin-top:8px;font-size:13px;color:#7A6A5A}
    section{margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #EDE6DD}
    h2{font-size:18px;letter-spacing:.03em;color:#5A3E2B;margin-bottom:12px;text-transform:uppercase}
    h3{font-size:14px;font-weight:bold;color:#7A5540;margin:14px 0 6px}
    p{font-size:14px;line-height:1.7;margin-bottom:10px}
    p.summary{font-size:15px;line-height:1.8;white-space:pre-line}
    table{width:100%;border-collapse:collapse;font-size:13px;margin:10px 0}
    th,td{padding:8px 10px;border:1px solid #E0D6CC;text-align:left}
    th{background:#F3EDE5;font-weight:bold}
    ul,ol{padding-left:20px;font-size:14px;line-height:1.7}
    li{margin-bottom:4px}
    .pill{display:inline-block;padding:2px 10px;border-radius:20px;font-size:12px;margin:2px;font-family:sans-serif}
    .swatch-wrap{display:inline-flex;align-items:center;gap:5px;font-size:12px;margin:3px 6px 3px 0;font-family:sans-serif}
    .swatch{display:inline-block;width:16px;height:16px;border-radius:4px;border:1px solid rgba(0,0,0,.15);flex-shrink:0}
    footer{text-align:center;font-size:11px;color:#A09080;margin-top:32px}
    @media print{body{padding:24px;background:#fff}section{page-break-inside:avoid}}
  </style>
</head>
<body>
  <header>
    <h1>✦ StyleAI Personal Beauty Report ✦</h1>
    <p>Generated ${new Date(r.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })} &nbsp;·&nbsp; Open in a browser and use <strong>File → Print → Save as PDF</strong></p>
  </header>
  ${parts.join("\n  ")}
  <footer>styleai.app &nbsp;·&nbsp; Report ID ${r.id}</footer>
</body>
</html>`;
}

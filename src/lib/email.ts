import { env } from "./env";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send transactional email via Resend.
 * Falls back to console.log in dev if RESEND_API_KEY is not set.
 */
export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[email] Would send to ${to}: ${subject}`);
      return { ok: true, mock: true };
    }
    console.warn("[email] RESEND_API_KEY not set — skipping");
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Renovaara <noreply@${env.app.url ? new URL(env.app.url).hostname : "renovaara.in"}>`,
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[email] Resend error:", err);
      return { ok: false, error: err };
    }

    return { ok: true };
  } catch (err) {
    console.error("[email] Failed to send:", err);
    return { ok: false, error: String(err) };
  }
}

// ── Template helpers ──────────────────────────────────────────

export function emailTemplate({ body }: { body: string }): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { font-family: 'Instrument Sans', -apple-system, sans-serif; background: #f5f0ec; margin: 0; padding: 0; }
  .container { max-width: 560px; margin: 0 auto; padding: 32px 24px; }
  .card { background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .brand { font-family: 'Fraunces', serif; font-size: 22px; color: #1a1412; text-align: center; margin-bottom: 24px; }
  .btn { display: inline-block; background: #1a1412; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 40px; font-size: 14px; font-weight: 600; }
  .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #a09080; }
</style>
</head>
<body>
<div class="container">
<div class="card">
<div class="brand">✨ Renovaara</div>
${body}
</div>
<div class="footer">
<p>Renovaara — AI-Powered Beauty Analysis</p>
</div>
</div>
</body>
</html>`;
}

// ── Email sequences ──────────────────────────────────────────

export function welcomeEmail(to: string): Promise<ReturnType<typeof sendEmail>> {
  return sendEmail({
    to,
    subject: "Welcome to Renovaara — discover your beauty profile",
    html: emailTemplate({
      body: `
        <h1 style="font-size:22px;margin-bottom:12px;">Welcome to Renovaara ✨</h1>
        <p style="font-size:14px;line-height:1.6;color:#5c5040;">Thanks for joining! Here's what to expect:</p>
        <ol style="font-size:14px;line-height:1.8;color:#5c5040;padding-left:20px;">
          <li><strong>Upload a selfie</strong> — one clear photo in natural light</li>
          <li><strong>AI analysis</strong> — we analyze face shape, colour season, skin, and more</li>
          <li><strong>Get your report</strong> — unlock 6 infographics and a PDF download</li>
        </ol>
        <div style="text-align:center;margin:28px 0;">
          <a href="${env.app.url}/upload" class="btn">Upload your first selfie</a>
        </div>
        <p style="font-size:13px;color:#a09080;text-align:center;">Your free face shape preview is ready in under 60 seconds.</p>
      `,
    }),
  });
}

export function reportReadyEmail(to: string, reportUrl: string, faceShape?: string): Promise<ReturnType<typeof sendEmail>> {
  return sendEmail({
    to,
    subject: "Your beauty report is ready!",
    html: emailTemplate({
      body: `
        <h1 style="font-size:22px;margin-bottom:12px;">Your analysis is complete ${faceShape ? `🎉` : "✨"}</h1>
        ${faceShape ? `<p style="font-size:16px;color:#C17A5F;font-weight:600;text-align:center;">Face shape detected: ${faceShape}</p>` : ""}
        <p style="font-size:14px;line-height:1.6;color:#5c5040;">Your AI beauty report is ready. Preview your face shape free, or unlock the full report to see:</p>
        <ul style="font-size:14px;line-height:1.8;color:#5c5040;padding-left:20px;">
          <li>12-season colour analysis</li>
          <li>Skin analysis with AM/PM routine</li>
          <li>Hairstyle & hair colour guide</li>
          <li>Spectacles frame guide</li>
          <li>Downloadable PDF</li>
        </ul>
        <div style="text-align:center;margin:28px 0;">
          <a href="${reportUrl}" class="btn">View your report</a>
        </div>
      `,
    }),
  });
}

import type { Metadata } from "next";
import Link from "next/link";
import { fmtInr } from "@/lib/landing-pricing";
import { publicEnv } from "@/lib/public-env";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Renovaara collects, uses, and protects your personal data.",
};

const LAST_UPDATED = "30 June 2026";
const CONTACT_EMAIL = "privacy@renovaara.in";
const APP_NAME = "Renovaara";
const COMPANY = "Renovaara (AI-Beauty)";

export default function PrivacyPage() {
  const reportPrice = fmtInr(publicEnv.razorpay.priceINR);
  const styleGuidePrice = fmtInr(publicEnv.razorpay.styleGuidePriceINR);

  return (
    <main className="min-h-app-viewport py-20 px-4">
      <article className="container max-w-3xl mx-auto prose-legal">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="font-sans text-4xl text-ink mb-3">Privacy Policy</h1>
          <p className="text-sm text-ink-stone">Last updated: {LAST_UPDATED}</p>
        </div>

        <Section title="1. Who We Are">
          <p>
            {APP_NAME} is an AI-powered beauty analysis platform operated by{" "}
            <strong className="text-ink">{COMPANY}</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). We provide
            face-shape analysis, six personalised analysis infographics (face features, skin, colour season,
            hairstyle, spectacles, and hair colour), downloadable PDFs, and an optional Style Guide add-on
            generated from a full-body photo.
          </p>
          <p>
            Questions about this policy? Reach us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-chrome-gold hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="2. Data We Collect">
          <SubHeading>2.1 Data you provide directly</SubHeading>
          <ul>
            <li>
              <strong>Selfie uploads</strong> — front-facing photo(s) you upload for face analysis and infographic
              generation.
            </li>
            <li>
              <strong>Full-body photos</strong> — optional image uploaded only if you purchase the Style Guide
              add-on ({styleGuidePrice}).
            </li>
            <li>
              <strong>Account information</strong> — email address and/or phone number collected via Supabase Auth
              (Google OAuth, magic link, or phone OTP).
            </li>
            <li>
              <strong>Payment details</strong> — processed entirely by Razorpay. We never store card numbers, CVVs,
              or bank credentials. We retain order IDs, amounts, and payment status for your account history.
            </li>
          </ul>

          <SubHeading>2.2 Data collected automatically</SubHeading>
          <ul>
            <li>
              <strong>Usage data</strong> — pages visited, features used, session duration, browser type, and
              device type (via Vercel Analytics / standard server logs).
            </li>
            <li>
              <strong>IP address</strong> — logged transiently for security, abuse prevention, and currency
              detection at checkout.
            </li>
            <li>
              <strong>Cookies</strong> — Supabase sets a session cookie for authentication. We do not use
              third-party advertising cookies.
            </li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Data">
          <ul>
            <li>Generate your free face-shape preview and, after unlock, your six analysis infographics and PDF.</li>
            <li>Generate your optional Style Guide infographic and PDF when you purchase that add-on.</li>
            <li>Authenticate your account and gate paid features.</li>
            <li>Process and verify payments via Razorpay webhooks (Full Report at {reportPrice}; Style Guide at {styleGuidePrice}).</li>
            <li>Send transactional emails (receipt and report-ready notifications) via Resend.</li>
            <li>Detect and prevent abuse, fraud, and unauthorised access.</li>
            <li>Improve our product experience using anonymised, aggregated analytics.</li>
          </ul>
          <p>
            We do <strong>not</strong> sell, rent, or trade your personal data to third parties for advertising
            purposes.
          </p>
        </Section>

        <Section title="4. Image and Facial Data">
          <p>
            Your selfie is transmitted securely to our AI pipeline for analysis. Under our API agreements, your
            images are <strong>not</strong> used to train third-party foundation models. We use AWS Rekognition for
            initial face detection and OpenAI for structured analysis; infographic and try-on visuals may be
            generated via Replicate and FAL.
          </p>
          <p>
            Selfies are stored in a private Supabase storage bucket accessible only to your account. Full-body
            photos for the Style Guide add-on are stored separately and processed only when you purchase that
            product.
          </p>
          <p>
            You may delete your report and associated images at any time from your dashboard. Deletion is permanent
            and irreversible.
          </p>
        </Section>

        <Section title="5. Legal Basis for Processing (GDPR / DPDP)">
          <ul>
            <li>
              <strong>Contract</strong> — processing required to deliver the service you requested or paid for.
            </li>
            <li>
              <strong>Legitimate interests</strong> — security, fraud prevention, and product improvement.
            </li>
            <li>
              <strong>Consent</strong> — for optional marketing emails, where you opt in explicitly.
            </li>
          </ul>
          <p>
            Indian users have rights under the <em>Digital Personal Data Protection Act, 2023</em> (DPDP Act),
            including the right to access, correct, and erase your data.
          </p>
        </Section>

        <Section title="6. Data Sharing">
          <p>We share data only with the following sub-processors, under confidentiality agreements:</p>
          <table className="legal-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Purpose</th>
                <th>Data shared</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>OpenAI</td>
                <td>AI text/vision analysis</td>
                <td>Photo, analysis prompts</td>
              </tr>
              <tr>
                <td>AWS Rekognition</td>
                <td>Face detection</td>
                <td>Photo</td>
              </tr>
              <tr>
                <td>Replicate / FAL</td>
                <td>Infographic &amp; visual generation</td>
                <td>Photo, generation prompts</td>
              </tr>
              <tr>
                <td>Supabase</td>
                <td>Auth, database &amp; storage</td>
                <td>Email, phone, report data, images</td>
              </tr>
              <tr>
                <td>Razorpay</td>
                <td>Payments</td>
                <td>Order amount, contact email</td>
              </tr>
              <tr>
                <td>Resend</td>
                <td>Transactional email</td>
                <td>Email address</td>
              </tr>
              <tr>
                <td>Vercel</td>
                <td>Hosting &amp; CDN</td>
                <td>IP, request logs</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section title="7. Data Retention">
          <ul>
            <li>
              <strong>Selfies and full-body photos</strong> — retained while your report is active; deleted when you
              delete the report or close your account.
            </li>
            <li>
              <strong>Report and infographic data</strong> — retained while your account is active, deleted within 30
              days of account closure.
            </li>
            <li>
              <strong>Payment records</strong> — retained for 7 years for tax and legal compliance.
            </li>
            <li>
              <strong>Auth logs</strong> — retained for 90 days.
            </li>
          </ul>
        </Section>

        <Section title="8. Security">
          <p>
            All data is transmitted over TLS 1.2+. Supabase enforces Row-Level Security (RLS) so each user can only
            access their own data. The selfies storage bucket is private. API keys and secrets are stored as
            encrypted environment variables and never exposed client-side.
          </p>
        </Section>

        <Section title="9. Children's Privacy">
          <p>
            {APP_NAME} is intended for users aged 13 and older. We do not knowingly collect personal data from
            children under 13. If you believe a child has provided us data, contact us immediately and we will
            delete it.
          </p>
        </Section>

        <Section title="10. Your Rights">
          <p>
            You may at any time: access the data we hold about you, correct inaccurate data, request deletion of
            your account and all associated data, or withdraw consent for optional communications.
          </p>
          <p>
            To exercise any right, email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-chrome-gold hover:underline">
              {CONTACT_EMAIL}
            </a>{" "}
            with the subject line &ldquo;Data Request&rdquo;. We will respond within 30 days.
          </p>
        </Section>

        <Section title="11. Changes to This Policy">
          <p>
            We may update this policy from time to time. Material changes will be communicated via email or an
            in-app banner at least 7 days before they take effect. Continued use of the service after that date
            constitutes acceptance.
          </p>
        </Section>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-wrap gap-4 text-sm text-ink-stone">
          <Link href="/terms" className="hover:text-ink transition-colors">Terms of Service</Link>
          <Link href="/" className="hover:text-ink transition-colors">← Back to Home</Link>
        </div>
      </article>
    </main>
  );
}

/* ── Shared layout sub-components ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-sans text-2xl text-ink mb-4">{title}</h2>
      <div className="space-y-3 text-ink-stone leading-relaxed text-[15px]">{children}</div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="font-semibold text-ink text-base mt-5 mb-2">{children}</h3>;
}

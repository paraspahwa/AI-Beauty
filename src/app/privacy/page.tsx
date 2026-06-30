import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Renovaara collects, uses, and protects your personal data.",
};

const LAST_UPDATED = "1 July 2025";
const CONTACT_EMAIL = "privacy@renovaara.in";
const APP_NAME = "Renovaara";
const COMPANY = "Renovaara (AI-Beauty)";

export default function PrivacyPage() {
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
            face-shape analysis, colour-season profiling, skin analysis, hairstyle
            and hair-colour guidance, spectacles recommendations, style guidance, and
            photorealistic preview image generation through our web application.
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
              <strong>Selfie / photo uploads</strong> — the image(s) you upload for analysis.
            </li>
            <li>
              <strong>Account information</strong> — email address collected via Supabase Auth
              (Google OAuth or magic link).
            </li>
            <li>
              <strong>Payment details</strong> — processed entirely by Razorpay. We never store
              card numbers, CVVs, or bank credentials.
            </li>
          </ul>

          <SubHeading>2.2 Data collected automatically</SubHeading>
          <ul>
            <li>
              <strong>Usage data</strong> — pages visited, features used, session duration,
              browser type, and device type (via Vercel Analytics / standard server logs).
            </li>
            <li>
              <strong>IP address</strong> — logged transiently for security and abuse prevention.
            </li>
            <li>
              <strong>Cookies</strong> — Supabase sets a session cookie for authentication. We do
              not use third-party advertising cookies.
            </li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Data">
          <ul>
            <li>Generate your personalised AI beauty report and style recommendations.</li>
            <li>Authenticate your account and gate paid features.</li>
            <li>Process and verify payments via Razorpay webhooks.</li>
            <li>Send transactional emails (receipt and report-ready notifications) via
              Resend.
            </li>
            <li>Detect and prevent abuse, fraud, and unauthorised access.</li>
            <li>Improve our AI models and product experience using anonymised, aggregated
              analytics.
            </li>
          </ul>
          <p>
            We do <strong>not</strong> sell, rent, or trade your personal data to third parties
            for advertising purposes.
          </p>
        </Section>

        <Section title="4. Facial Image Data">
          <p>
            Your uploaded photo is transmitted securely to OpenAI&apos;s API for analysis only. It
            is <strong>not</strong> used to train OpenAI&apos;s models under our API agreement. After
            analysis is complete, the image is retained in your account for 30 days so you can
            re-access your report, then automatically deleted from storage.
          </p>
          <p>
            You may delete your report and associated images at any time from your dashboard.
            Deletion is permanent and irreversible.
          </p>
        </Section>

        <Section title="5. Legal Basis for Processing (GDPR / DPDP)">
          <ul>
            <li>
              <strong>Contract</strong> — processing required to deliver the service you paid
              for.
            </li>
            <li>
              <strong>Legitimate interests</strong> — security, fraud prevention, and product
              improvement.
            </li>
            <li>
              <strong>Consent</strong> — for optional marketing emails, where you opt in
              explicitly.
            </li>
          </ul>
          <p>
            Indian users have rights under the <em>Digital Personal Data Protection Act, 2023</em>{" "}
            (DPDP Act), including the right to access, correct, and erase your data.
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
                <td>AI analysis</td>
                <td>Photo, prompt</td>
              </tr>
              <tr>
                <td>Supabase</td>
                <td>Auth &amp; database</td>
                <td>Email, report data</td>
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
              <strong>Photos</strong> — deleted 30 days after upload (or immediately on manual
              deletion).
            </li>
            <li>
              <strong>Report data</strong> — retained while your account is active, deleted
              within 30 days of account closure.
            </li>
            <li>
              <strong>Payment records</strong> — retained for 7 years for tax and legal
              compliance.
            </li>
            <li>
              <strong>Auth logs</strong> — retained for 90 days.
            </li>
          </ul>
        </Section>

        <Section title="8. Security">
          <p>
            All data is transmitted over TLS 1.2+. Supabase enforces Row-Level Security (RLS)
            so each user can only access their own data. API keys and secrets are stored as
            encrypted environment variables and never exposed client-side.
          </p>
        </Section>

        <Section title="9. Children's Privacy">
          <p>
            {APP_NAME} is intended for users aged 13 and older. We do not knowingly collect
            personal data from children under 13. If you believe a child has provided us data,
            contact us immediately and we will delete it.
          </p>
        </Section>

        <Section title="10. Your Rights">
          <p>
            You may at any time: access the data we hold about you, correct inaccurate data,
            request deletion of your account and all associated data, or withdraw consent for
            optional communications.
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
            We may update this policy from time to time. Material changes will be communicated
            via email or an in-app banner at least 7 days before they take effect. Continued
            use of the service after that date constitutes acceptance.
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


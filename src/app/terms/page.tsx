import type { Metadata } from "next";
import Link from "next/link";
import { fmtInr } from "@/lib/landing-pricing";
import { publicEnv } from "@/lib/public-env";
import { PRODUCT_COPY } from "@/lib/product-copy";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms and conditions governing your use of Renovaara.",
};

const LAST_UPDATED = "30 June 2026";
const CONTACT_EMAIL = "support@renovaara.in";
const APP_NAME = "Renovaara";
const COMPANY = "Renovaara (AI-Beauty)";
const GOVERNING_LAW = "India";
const JURISDICTION = "courts of India";

export default function TermsPage() {
  const reportPrice = fmtInr(publicEnv.razorpay.priceINR);
  const styleGuidePrice = fmtInr(publicEnv.razorpay.styleGuidePriceINR);

  return (
    <main className="min-h-app-viewport py-20 px-4">
      <article className="container max-w-3xl mx-auto prose-legal">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="font-sans text-4xl text-ink mb-3">Terms of Service</h1>
          <p className="text-sm text-ink-stone">Last updated: {LAST_UPDATED}</p>
        </div>

        <Section title="1. Acceptance of Terms">
          <p>
            By accessing or using <strong className="text-ink">{APP_NAME}</strong> (the
            &ldquo;Service&rdquo;) operated by <strong className="text-ink">{COMPANY}</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;,
            &ldquo;our&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not
            agree, please do not use the Service.
          </p>
          <p>
            We may update these Terms at any time. Continued use of the Service after any change constitutes your
            acceptance of the revised Terms. We will notify you of material changes via email or an in-app banner.
          </p>
        </Section>

        <Section title="2. Description of Service">
          <p>{APP_NAME} is an AI-powered personal beauty analysis platform. From a single selfie we provide:</p>
          <ul>
            <li>
              A <strong>free preview</strong> — {PRODUCT_COPY.free.items.join("; ")}.
            </li>
            <li>
              A <strong>Full Report</strong> (one-time unlock at {reportPrice}) — six luxury analysis infographics:
              <ul>
                {PRODUCT_COPY.report.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </li>
            <li>
              An optional <strong>Style Guide add-on</strong> ({styleGuidePrice}, purchased separately after Full
              Report unlock) — {PRODUCT_COPY.styleGuide.items.join("; ")}.
            </li>
          </ul>
          <p>
            The Style Guide is not included in the Full Report price. Each product is a separate one-time purchase
            with no subscription.
          </p>
        </Section>

        <Section title="3. User Accounts">
          <ul>
            <li>
              You must provide accurate information when creating an account via Google OAuth, magic-link email, or
              phone OTP.
            </li>
            <li>
              You are responsible for all activity that occurs under your account. Do not share your login
              credentials.
            </li>
            <li>
              We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent
              activity, or abuse the platform.
            </li>
          </ul>
        </Section>

        <Section title="4. Acceptable Use">
          <p>You agree <strong>not</strong> to:</p>
          <ul>
            <li>Upload photos of individuals without their consent.</li>
            <li>Upload photos of minors for analysis.</li>
            <li>Attempt to reverse-engineer, scrape, or bypass any part of the Service.</li>
            <li>Use the Service for any unlawful purpose or in violation of any applicable law.</li>
            <li>
              Resell, redistribute, or commercially exploit report outputs or infographics without written permission
              from us.
            </li>
            <li>
              Use automated tools (bots, scripts) to access the Service in a manner that places unreasonable load on
              our infrastructure.
            </li>
          </ul>
        </Section>

        <Section title="5. Payments and Pricing">
          <SubHeading>5.1 Full Report</SubHeading>
          <ul>
            <li>
              The Full Report costs a one-time fee of <strong className="text-ink">{reportPrice}</strong> (inclusive
              of applicable taxes where required). Prices are shown in Indian Rupees (INR) for Indian users.
            </li>
            <li>
              Payment unlocks all six analysis infographics and the downloadable analysis PDF for that specific
              report, permanently tied to your account.
            </li>
          </ul>
          <SubHeading>5.2 Style Guide add-on</SubHeading>
          <ul>
            <li>
              The Style Guide costs a separate one-time fee of{" "}
              <strong className="text-ink">{styleGuidePrice}</strong> per report.
            </li>
            <li>
              It requires an unlocked Full Report and a full-body photo upload. It is not bundled with the main
              report purchase.
            </li>
          </ul>
          <SubHeading>5.3 General payment terms</SubHeading>
          <ul>
            <li>
              Payments are processed securely by <strong>Razorpay</strong>. We do not store any card or banking
              credentials.
            </li>
            <li>
              We reserve the right to change pricing. Any price change will be communicated at least 7 days in
              advance and will not affect already-purchased reports.
            </li>
          </ul>
        </Section>

        <Section title="6. Digital Product and Cancellations">
          <p>
            {APP_NAME} delivers digital infographics and PDFs generated on demand. Once a report or Style Guide is
            successfully delivered to your account, payments are final and non-refundable.
          </p>
          <p>
            If there is a technical delivery failure caused by our platform, please contact{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-chrome-gold hover:underline">
              {CONTACT_EMAIL}
            </a>{" "}
            and we will investigate and resolve the issue.
          </p>
        </Section>

        <Section title="7. AI-Generated Content Disclaimer">
          <p>
            {APP_NAME} uses artificial intelligence to generate beauty analysis infographics and recommendations.
            The outputs are <strong>advisory and for personal guidance purposes only</strong>. They do not constitute
            professional medical, dermatological, optical, or cosmetic advice.
          </p>
          <p>
            AI analysis and generated visuals may occasionally be inaccurate. We make no guarantees about the
            accuracy, completeness, or fitness for purpose of any generated infographic or recommendation.
          </p>
        </Section>

        <Section title="8. Intellectual Property">
          <p>
            All platform code, branding, design, and proprietary prompts are owned by {COMPANY} and protected by
            applicable intellectual-property laws. You may not copy or imitate any part of the platform.
          </p>
          <p>
            <strong>Your content:</strong> You retain ownership of any photos you upload. By uploading, you grant us
            a limited, non-exclusive licence to process your photos solely for the purpose of generating your report
            or Style Guide. We do not claim ownership of your images. See our{" "}
            <Link href="/privacy" className="text-chrome-gold hover:underline">
              Privacy Policy
            </Link>{" "}
            for data-retention details.
          </p>
        </Section>

        <Section title="9. Limitation of Liability">
          <p>
            To the maximum extent permitted by applicable law, {COMPANY} shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages arising from your use of (or inability to use) the
            Service, even if we have been advised of the possibility of such damages.
          </p>
          <p>
            Our total aggregate liability for any claim shall not exceed the amount you paid us in the 30 days prior
            to the event giving rise to the claim.
          </p>
        </Section>

        <Section title="10. Indemnification">
          <p>
            You agree to indemnify and hold harmless {COMPANY} and its team from any claims, damages, or expenses
            (including reasonable legal fees) arising from your violation of these Terms or misuse of the Service.
          </p>
        </Section>

        <Section title="11. Governing Law and Dispute Resolution">
          <p>
            These Terms are governed by the laws of <strong className="text-ink">{GOVERNING_LAW}</strong>. Any
            disputes shall be subject to the exclusive jurisdiction of the{" "}
            <strong className="text-ink">{JURISDICTION}</strong>. Before pursuing formal legal action, both parties
            agree to attempt good-faith resolution by emailing{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-chrome-gold hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            For questions about these Terms, email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-chrome-gold hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-wrap gap-4 text-sm text-ink-stone">
          <Link href="/privacy" className="hover:text-ink transition-colors">Privacy Policy</Link>
          <Link href="/" className="hover:text-ink transition-colors">← Back to Home</Link>
        </div>
      </article>
    </main>
  );
}

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

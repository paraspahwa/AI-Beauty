import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Renovaara's refund and cancellation policy for paid reports.",
};

const LAST_UPDATED = "1 July 2025";
const CONTACT_EMAIL = "support@renovaara.in";
const APP_NAME = "Renovaara";
const REFUND_WINDOW_HOURS = 72;
const PRICE_INR = "₹399";

export default function RefundPage() {
  return (
    <main className="min-h-screen py-20 px-4">
      <article className="container max-w-3xl mx-auto prose-legal">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="font-serif text-4xl text-ink mb-3">Refund Policy</h1>
          <p className="text-sm text-ink-stone">Last updated: {LAST_UPDATED}</p>
        </div>

        {/* Quick-summary card */}
        <div
          className="mb-10 rounded-2xl border p-6"
          style={{
            borderColor: "rgba(201,149,107,0.25)",
            background: "rgba(201,149,107,0.06)",
          }}
        >
          <h2 className="font-serif text-xl text-ink mb-3">Quick Summary</h2>
          <ul className="space-y-2 text-[15px] text-ink-stone">
            <li>✅ Full refund within <strong className="text-ink">{REFUND_WINDOW_HOURS} hours</strong> if your report fails to generate.</li>
            <li>✅ Full refund if the report is clearly erroneous due to a platform error.</li>
            <li>❌ No refund if the report was successfully delivered and you simply didn't like the recommendations.</li>
            <li>❌ No refund after {REFUND_WINDOW_HOURS} hours of payment.</li>
          </ul>
        </div>

        <Section title="1. Our Commitment">
          <p>
            We want you to be delighted with your {APP_NAME} experience. Our AI report is
            generated instantly after payment and is personalised to your uploaded photo.
            Because the analysis is performed and delivered immediately, our refund window is
            limited but fair.
          </p>
        </Section>

        <Section title="2. When You Are Eligible for a Full Refund">
          <p>You qualify for a full refund of <strong className="text-ink">{PRICE_INR}</strong> if:</p>
          <ul>
            <li>
              <strong>Report generation failed</strong> — the system accepted your payment but
              did not successfully generate a report within 10 minutes.
            </li>
            <li>
              <strong>Platform error</strong> — the report was generated but contains an
              obvious technical error (e.g., all sections blank, placeholder text, analysis
              clearly based on the wrong photo).
            </li>
            <li>
              <strong>Duplicate charge</strong> — you were charged more than once for the same
              report due to a payment-system error.
            </li>
          </ul>
          <p>
            Refund requests must be submitted within{" "}
            <strong className="text-ink">{REFUND_WINDOW_HOURS} hours</strong> of the original
            payment time.
          </p>
        </Section>

        <Section title="3. When Refunds Are Not Available">
          <ul>
            <li>
              The report was successfully generated and delivered to your account, and you are
              dissatisfied with the style recommendations or analysis (subjective preference).
            </li>
            <li>
              You uploaded a blurry, obscured, or group photo that produced a low-quality
              result — we recommend using a clear, front-facing selfie as described in our
              upload guidelines.
            </li>
            <li>
              More than {REFUND_WINDOW_HOURS} hours have passed since payment.
            </li>
            <li>
              Your account was suspended for a Terms of Service violation.
            </li>
          </ul>
        </Section>

        <Section title="4. How to Request a Refund">
          <ol className="list-decimal list-inside space-y-2">
            <li>
              Email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold hover:underline">
                {CONTACT_EMAIL}
              </a>{" "}
              with the subject line{" "}
              <strong className="text-ink">"Refund Request — [your registered email]"</strong>.
            </li>
            <li>
              Include your Razorpay Payment ID (found in your confirmation email or payment
              receipt).
            </li>
            <li>Briefly describe the issue (failed generation, duplicate charge, etc.).</li>
          </ol>
          <p>
            We aim to review all refund requests within{" "}
            <strong className="text-ink">2 business days</strong>. Approved refunds are
            processed via Razorpay back to your original payment method and typically reflect
            within <strong>5–7 business days</strong>, depending on your bank.
          </p>
        </Section>

        <Section title="5. Partial Refunds">
          <p>
            We do not offer partial refunds. If a refund is approved, the full payment of{" "}
            {PRICE_INR} is returned.
          </p>
        </Section>

        <Section title="6. Chargebacks">
          <p>
            We ask you to contact us before initiating a chargeback with your bank or card
            issuer. Chargebacks incur fees that disproportionately harm small businesses. If
            you have a legitimate issue, we will resolve it fairly and promptly.
          </p>
          <p>
            Accounts with disputed chargebacks may be temporarily suspended pending
            investigation.
          </p>
        </Section>

        <Section title="7. Subscription Plans (Future)">
          <p>
            When subscription tiers are launched, this policy will be updated to include
            pro-rata refunds for unused subscription periods. Watch this page for updates.
          </p>
        </Section>

        <Section title="8. Contact">
          <p>
            For any refund-related questions, please email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold hover:underline">
              {CONTACT_EMAIL}
            </a>
            . We typically respond within 24 hours on business days.
          </p>
        </Section>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-wrap gap-4 text-sm text-ink-stone">
          <Link href="/privacy" className="hover:text-ink transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-ink transition-colors">Terms of Service</Link>
          <Link href="/" className="hover:text-ink transition-colors">← Back to Home</Link>
        </div>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-serif text-2xl text-ink mb-4">{title}</h2>
      <div className="space-y-3 text-ink-stone leading-relaxed text-[15px]">{children}</div>
    </section>
  );
}


"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/ImageUploader";
import { CheckCircle2 } from "lucide-react";
import { fadeUp, staggerContainer } from "@/lib/animations";

const TIPS = [
  "Look straight into the camera, hair off your forehead",
  "Use natural light if possible — avoid heavy filters",
  "One face per photo gives the most accurate report",
];

export default function UploadPage() {
  const router = useRouter();

  return (
    <main className="container max-w-4xl py-12 sm:py-20 min-h-screen">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.header variants={fadeUp} className="mb-12 text-center">
          <p className="text-xs uppercase tracking-[0.3em] font-medium mb-3" style={{ color: "#C9956B" }}>
            Step 1 of 2
          </p>
          <h1 className="text-4xl sm:text-5xl text-ink mb-4">
            Upload your selfie
          </h1>
          <p className="mx-auto max-w-md text-base text-ink-stone leading-relaxed">
            A clear, well-lit, front-facing photo gives the best results. Your image is private
            and secure.
          </p>
        </motion.header>

        <motion.div variants={fadeUp}>
          <ImageUploader onUploaded={(reportId) => router.push(`/report/${reportId}`)} />
        </motion.div>

        <motion.div
          variants={staggerContainer}
          className="mx-auto mt-12 max-w-md"
        >
          <motion.h3
            variants={fadeUp}
            className="text-center text-sm font-medium text-ink mb-4 uppercase tracking-widest"
          >
            Tips for best results
          </motion.h3>
          <motion.ul className="space-y-3">
            {TIPS.map((tip, index) => (
              <motion.li
                key={index}
                variants={fadeUp}
                className="flex items-start gap-3 text-sm text-ink-stone"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#C9956B" }} />
                <span>{tip}</span>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Privacy reassurance */}
        <motion.div
          variants={fadeUp}
          className="mx-auto mt-12 max-w-md rounded-2xl p-6 text-center"
          style={{ background: "linear-gradient(145deg, rgba(18,18,26,0.95), rgba(26,26,38,0.9))", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-xs uppercase tracking-widest font-medium mb-2" style={{ color: "#7B6E9E" }}>
            Your Privacy Matters
          </p>
          <p className="text-sm text-ink-stone leading-relaxed">
            Your photo is encrypted and stored securely. Only you can access your report. We never
            share your data with third parties.
          </p>
        </motion.div>
      </motion.div>
    </main>
  );
}

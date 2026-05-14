"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Camera,
  Glasses,
  Scissors,
  ShieldCheck,
  Star,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  Lock,
  ShoppingBag,
  Wand2,
  Droplets,
  Zap,
  ScanFace,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  staggerContainer,
  fadeUp,
  slideIn,
  scaleIn,
  blurIn,
  springPop,
  cascadeContainer,
} from "@/lib/animations";

// ── Mouse-follow glow background ─────────────────────────────────────────────
function MouseGlow() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  useEffect(() => {
    const move = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        background: useTransform(
          [smoothX, smoothY],
          ([x, y]: number[]) =>
            `radial-gradient(600px circle at ${x}px ${y}px, rgba(201,149,107,0.07), transparent 70%)`
        ),
      }}
    />
  );
}

// ── Pulsing AI badge ──────────────────────────────────────────────────────────
function AiBadge() {
  return (
    <motion.span
      variants={springPop}
      className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.25em] font-semibold"
      style={{
        color: "#E8C990",
        background: "rgba(201,149,107,0.08)",
        borderColor: "rgba(201,149,107,0.3)",
      }}
      animate={{
        boxShadow: [
          "0 0 0 0px rgba(201,149,107,0.35)",
          "0 0 0 7px rgba(201,149,107,0.0)",
        ],
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
    >
      <motion.span
        className="h-1.5 w-1.5 rounded-full bg-[#E8C990]"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      AI Personal Stylist · 2026
    </motion.span>
  );
}

// ── Shimmer skeleton ──────────────────────────────────────────────────────────
function ShimmerLine({ w = "100%", h = 8 }: { w?: string; h?: number }) {
  return (
    <div
      className="rounded-full overflow-hidden"
      style={{ width: w, height: h, background: "rgba(255,255,255,0.05)" }}
    >
      <motion.div
        className="h-full w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.09) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
        }}
        animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function SkeletonReportCard() {
  return (
    <div
      className="rounded-3xl p-6 space-y-4"
      style={{
        background: "linear-gradient(145deg, #12121A, #1A1A26)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-full shrink-0"
          style={{ background: "rgba(201,149,107,0.15)" }}
        />
        <div className="flex-1 space-y-2">
          <ShimmerLine w="60%" h={8} />
          <ShimmerLine w="40%" h={6} />
        </div>
        <ShimmerLine w="20%" h={20} />
      </div>
      <ShimmerLine w="100%" h={80} />
      <div className="space-y-2">
        <ShimmerLine w="100%" h={36} />
        <ShimmerLine w="100%" h={36} />
        <ShimmerLine w="100%" h={36} />
      </div>
    </div>
  );
}

// ── Face scan animation ───────────────────────────────────────────────────────
const SCAN_TAGS = [
  { label: "Oval Face", x: "62%", y: "28%", delay: 0 },
  { label: "Soft Autumn", x: "4%", y: "44%", delay: 0.12 },
  { label: "Warm Undertone", x: "50%", y: "66%", delay: 0.24 },
  { label: "High Cheekbones", x: "4%", y: "22%", delay: 0.36 },
];

function FaceScanDemo() {
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startScan = useCallback(() => {
    if (scanning) return;
    setScanning(true);
    setDone(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setScanning(false);
      setDone(true);
    }, 2200);
  }, [scanning]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return (
    <div className="relative select-none">
      <div
        className="relative mx-auto w-full max-w-[280px] rounded-3xl overflow-hidden"
        style={{
          aspectRatio: "3/4",
          background:
            "linear-gradient(160deg, rgba(201,149,107,0.12), rgba(123,110,158,0.12))",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Silhouette */}
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30">
          <ScanFace className="h-24 w-24" style={{ color: "#C9956B" }} />
        </div>

        {/* Corner scan brackets */}
        {[
          "top-3 left-3 border-t-2 border-l-2 rounded-tl-lg",
          "top-3 right-3 border-t-2 border-r-2 rounded-tr-lg",
          "bottom-3 left-3 border-b-2 border-l-2 rounded-bl-lg",
          "bottom-3 right-3 border-b-2 border-r-2 rounded-br-lg",
        ].map((cls, i) => (
          <div
            key={i}
            className={`absolute h-6 w-6 ${cls}`}
            style={{ borderColor: "#C9956B" }}
          />
        ))}

        {/* Scanning beam */}
        <AnimatePresence>
          {scanning && (
            <motion.div
              key="beam"
              className="absolute left-0 right-0 h-[2px]"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(201,149,107,0.95), transparent)",
                boxShadow: "0 0 18px 5px rgba(201,149,107,0.5)",
              }}
              initial={{ top: "0%" }}
              animate={{ top: "100%" }}
              transition={{ duration: 2, ease: "linear" }}
            />
          )}
        </AnimatePresence>

        {/* Result tags */}
        <AnimatePresence>
          {done &&
            SCAN_TAGS.map((tag) => (
              <motion.div
                key={tag.label}
                className="absolute"
                style={{ left: tag.x, top: tag.y }}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: tag.delay,
                  type: "spring",
                  stiffness: 320,
                  damping: 22,
                }}
              >
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap"
                  style={{
                    background: "rgba(201,149,107,0.9)",
                    color: "#0A0A0F",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  {tag.label}
                </span>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>

      {/* Trigger */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={startScan}
          disabled={scanning}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50"
          style={{
            background: done
              ? "rgba(99,162,130,0.2)"
              : "rgba(201,149,107,0.15)",
            color: done ? "#63A282" : "#E8C990",
            border: `1px solid ${
              done ? "rgba(99,162,130,0.3)" : "rgba(201,149,107,0.3)"
            }`,
          }}
        >
          {scanning ? (
            <>
              <motion.div
                className="h-3 w-3 rounded-full border border-current border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
              Scanning...
            </>
          ) : done ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" /> Analysis complete
            </>
          ) : (
            <>
              <ScanFace className="h-3.5 w-3.5" /> Click to Analyse
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Bento grid ────────────────────────────────────────────────────────────────
function BentoGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Large tile — Virtual Try-On */}
      <motion.div
        variants={fadeUp}
        whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.25 } }}
        className="col-span-2 lg:row-span-2 relative rounded-3xl p-6 overflow-hidden cursor-pointer group"
        style={{
          background:
            "linear-gradient(145deg, rgba(201,149,107,0.12), rgba(18,18,26,0.95))",
          border: "1px solid rgba(201,149,107,0.22)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background:
              "radial-gradient(circle at 60% 30%, rgba(201,149,107,0.13), transparent 70%)",
          }}
        />
        <div
          className="h-12 w-12 rounded-2xl flex items-center justify-center mb-4"
          style={{
            background: "rgba(201,149,107,0.15)",
            border: "1px solid rgba(201,149,107,0.25)",
          }}
        >
          <ShoppingBag className="h-6 w-6" style={{ color: "#C9956B" }} />
        </div>
        <h3 className="font-serif text-xl text-ink mb-2">
          Virtual Clothing Try-On
        </h3>
        <p className="text-sm text-ink-stone leading-relaxed mb-6">
          Upload any garment — flat-lay or mannequin — and see it draped on your
          body instantly. Selfie or full-body mode.
        </p>

        {/* Before / after slider */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            height: 120,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div
            className="absolute inset-y-0 left-0 w-1/2 flex items-center justify-center border-r"
            style={{
              borderColor: "rgba(201,149,107,0.3)",
              background: "rgba(201,149,107,0.05)",
            }}
          >
            <span
              className="text-[10px] uppercase tracking-wider"
              style={{ color: "rgba(240,232,216,0.4)" }}
            >
              Before
            </span>
          </div>
          <div
            className="absolute inset-y-0 right-0 w-1/2 flex items-center justify-center"
            style={{ background: "rgba(201,149,107,0.08)" }}
          >
            <span
              className="text-[10px] uppercase tracking-wider"
              style={{ color: "#E8C990" }}
            >
              After ✦
            </span>
          </div>
          <motion.div
            className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center justify-center z-10 cursor-grab active:cursor-grabbing"
            drag="x"
            dragConstraints={{ left: -80, right: 80 }}
            dragElastic={0.08}
          >
            <div className="h-full w-0.5" style={{ background: "#C9956B" }} />
            <div
              className="absolute h-7 w-7 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: "#C9956B", color: "#0A0A0F" }}
            >
              <span className="text-[10px] font-bold select-none">{"<>"}</span>
            </div>
          </motion.div>
        </div>

        <span
          className="mt-4 inline-flex items-center gap-1 text-xs font-medium"
          style={{ color: "#C9956B" }}
        >
          Try it free <ArrowRight className="h-3 w-3" />
        </span>
      </motion.div>

      {/* Makeup Studio */}
      <motion.div
        variants={fadeUp}
        whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.25 } }}
        className="col-span-1 relative rounded-3xl p-5 overflow-hidden cursor-pointer group"
        style={{
          background:
            "linear-gradient(145deg, rgba(123,110,158,0.12), rgba(18,18,26,0.95))",
          border: "1px solid rgba(123,110,158,0.2)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background:
              "radial-gradient(circle at 40% 40%, rgba(123,110,158,0.15), transparent 70%)",
          }}
        />
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center mb-3"
          style={{
            background: "rgba(123,110,158,0.15)",
            border: "1px solid rgba(123,110,158,0.25)",
          }}
        >
          <Wand2 className="h-5 w-5" style={{ color: "#A69CC4" }} />
        </div>
        <h3 className="font-semibold text-ink text-sm mb-1">Makeup Studio</h3>
        <p className="text-xs text-ink-stone leading-relaxed">
          Lip colour, eyeshadow, blush, contour — photorealistic preview on your
          face.
        </p>
        <div className="flex gap-1.5 mt-3">
          {["#E8A0A0", "#C9956B", "#A89CC8", "#D4857A", "#63A282"].map(
            (hex) => (
              <div
                key={hex}
                className="h-4 w-4 rounded-full border border-white/10 shadow-sm"
                style={{ background: hex }}
              />
            )
          )}
        </div>
      </motion.div>

      {/* Spectacles */}
      <motion.div
        variants={fadeUp}
        whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.25 } }}
        className="col-span-1 relative rounded-3xl p-5 overflow-hidden cursor-pointer group"
        style={{
          background:
            "linear-gradient(145deg, rgba(99,143,179,0.1), rgba(18,18,26,0.95))",
          border: "1px solid rgba(99,143,179,0.18)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background:
              "radial-gradient(circle at 40% 40%, rgba(99,143,179,0.12), transparent 70%)",
          }}
        />
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center mb-3"
          style={{
            background: "rgba(99,143,179,0.15)",
            border: "1px solid rgba(99,143,179,0.25)",
          }}
        >
          <Glasses className="h-5 w-5" style={{ color: "#638FB3" }} />
        </div>
        <h3 className="font-semibold text-ink text-sm mb-1">
          Spectacles Guide
        </h3>
        <p className="text-xs text-ink-stone leading-relaxed">
          Frame shapes, metals, and colours matched to your face shape and
          undertone.
        </p>
      </motion.div>

      {/* Skin Analysis */}
      <motion.div
        variants={fadeUp}
        whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.25 } }}
        className="col-span-1 relative rounded-3xl p-5 overflow-hidden cursor-pointer group"
        style={{
          background:
            "linear-gradient(145deg, rgba(99,162,130,0.1), rgba(18,18,26,0.95))",
          border: "1px solid rgba(99,162,130,0.18)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background:
              "radial-gradient(circle at 40% 40%, rgba(99,162,130,0.12), transparent 70%)",
          }}
        />
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center mb-3"
          style={{
            background: "rgba(99,162,130,0.15)",
            border: "1px solid rgba(99,162,130,0.25)",
          }}
        >
          <Droplets className="h-5 w-5" style={{ color: "#63A282" }} />
        </div>
        <h3 className="font-semibold text-ink text-sm mb-1">Skin Analysis</h3>
        <p className="text-xs text-ink-stone leading-relaxed">
          AM/PM routine, concern severity, ingredient recommendations.
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          {["Oily", "Acne", "SPF"].map((tag) => (
            <span
              key={tag}
              className="text-[10px] rounded-full px-2 py-0.5"
              style={{ background: "rgba(99,162,130,0.15)", color: "#63A282" }}
            >
              {tag}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Hairstyle */}
      <motion.div
        variants={fadeUp}
        whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.25 } }}
        className="col-span-1 relative rounded-3xl p-5 overflow-hidden cursor-pointer group"
        style={{
          background:
            "linear-gradient(145deg, rgba(212,133,122,0.1), rgba(18,18,26,0.95))",
          border: "1px solid rgba(212,133,122,0.18)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background:
              "radial-gradient(circle at 40% 40%, rgba(212,133,122,0.12), transparent 70%)",
          }}
        />
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center mb-3"
          style={{
            background: "rgba(212,133,122,0.15)",
            border: "1px solid rgba(212,133,122,0.25)",
          }}
        >
          <Scissors className="h-5 w-5" style={{ color: "#D4857A" }} />
        </div>
        <h3 className="font-semibold text-ink text-sm mb-1">
          Hairstyle &amp; Color
        </h3>
        <p className="text-xs text-ink-stone leading-relaxed">
          AI hair-color and cut previews matched to your face shape and season.
        </p>
      </motion.div>
    </div>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: "Sarah K.",
    tag: "Virtual Try-On",
    quote:
      "I tried on 10 outfits without leaving my house. The try-on is shockingly accurate!",
    rating: 5,
  },
  {
    name: "Priya M.",
    tag: "Makeup Studio",
    quote:
      "Picking my exact lip shade and seeing it on MY face — absolute game changer before buying anything.",
    rating: 5,
  },
  {
    name: "Emma L.",
    tag: "Hairstyle Guide",
    quote:
      "The AI hairstyle previews saved me from a bad cut. Best ₹299 I have spent on myself.",
    rating: 5,
  },
];

// ── FAQ data ──────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "How accurate is the AI analysis?",
    a: "Our AI combines AWS Rekognition for facial detection with GPT-4o for color, skin, and style analysis. Results work best with a clear, well-lit, front-facing photo with no sunglasses.",
  },
  {
    q: "Is my photo stored or shared?",
    a: "Your privacy is paramount. Photos are encrypted, stored securely, and only accessible to you. We never share your data with third parties.",
  },
  {
    q: "What is included in the free preview?",
    a: "You will get face shape identification and a personalised introduction — completely free, no card required. The Full Report (Rs 299 one-time) unlocks skin analysis, spectacles guide, hairstyle guide, 5 AI Studio generations, and a downloadable PDF. Studio Pro (Rs 999/mo) adds unlimited reports and 150 AI generations per month.",
  },
  {
    q: "How does the AI Makeup Studio work?",
    a: "Choose your exact lip colour, eyeshadow palette, blush shade and intensity, foundation tone, contour toggle, and eyeliner style — then hit Apply Makeup to generate a photorealistic preview on your actual photo.",
  },
  {
    q: "How does Virtual Clothing Try-On work?",
    a: "Upload a flat-lay or mannequin photo of any garment. For the best draping results, switch to Full Body mode and upload a standing photo. Our AI uses fal-ai virtual try-on model to place the garment on you realistically.",
  },
  {
    q: "Can I share my report?",
    a: "Yes — hit Share on your report to generate a public link anyone can view (read-only). You can revoke it any time.",
  },
  {
    q: "Can I get a refund?",
    a: "Yes! We offer a 30-day money-back guarantee on all paid plans. If you are not satisfied, contact us for a full refund — no questions asked.",
  },
];

// ── Mock report card ──────────────────────────────────────────────────────────
function MockReportCard() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 1400);
    return () => clearTimeout(t);
  }, []);

  if (!loaded) return <SkeletonReportCard />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-3xl p-6 overflow-hidden"
      style={{
        background: "linear-gradient(145deg, #12121A, #1A1A26)",
        border: "1px solid rgba(201,149,107,0.2)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
      }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.025)_50%,transparent_60%)] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-terracotta to-camel text-white">
            <Sparkles className="h-3 w-3" />
          </div>
          <span className="font-serif text-sm text-ink">Renovaara Report</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs rounded-full px-2 py-0.5 font-medium"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "#888",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            Sample
          </span>
          <span
            className="text-xs rounded-full px-3 py-1 font-medium"
            style={{
              background: "rgba(201,149,107,0.15)",
              color: "#E8C990",
              border: "1px solid rgba(201,149,107,0.25)",
            }}
          >
            Soft Autumn
          </span>
        </div>
      </div>

      {/* Face + shape */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative shrink-0">
          <div
            className="h-20 w-20 rounded-full flex items-center justify-center border-2"
            style={{
              background:
                "linear-gradient(135deg, rgba(201,149,107,0.3), rgba(123,110,158,0.2))",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <Camera className="h-7 w-7" style={{ color: "#C9956B" }} />
          </div>
          <div
            className="absolute -bottom-1 -right-1 rounded-full p-1 border-2"
            style={{ background: "#7B6E9E", borderColor: "rgba(26,26,38,1)" }}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink mb-1">Face shape</p>
          <div className="flex flex-wrap gap-1.5">
            {["Oval", "Balanced", "Symmetrical"].map((t) => (
              <span key={t} className="pill text-xs">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Virtual Try-On teaser */}
      <div
        className="mb-4 rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <ShoppingBag className="h-3.5 w-3.5" style={{ color: "#C9956B" }} />
          <p className="text-xs font-medium" style={{ color: "#E8C990" }}>
            Virtual Try-On
          </p>
          <span
            className="ml-auto text-[10px] rounded-full px-2 py-0.5 font-medium"
            style={{ background: "rgba(201,149,107,0.15)", color: "#C8A96E" }}
          >
            Premium
          </span>
        </div>
        <div className="flex items-center gap-3 px-3 py-3">
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(201,149,107,0.12)" }}
          >
            <Camera className="h-5 w-5" style={{ color: "#C9956B" }} />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div
              className="h-2 w-3/4 rounded-full"
              style={{ background: "rgba(255,255,255,0.06)" }}
            />
            <div
              className="h-2 w-1/2 rounded-full"
              style={{ background: "rgba(255,255,255,0.04)" }}
            />
          </div>
          <Wand2 className="h-4 w-4 shrink-0" style={{ color: "#C8A96E" }} />
        </div>
      </div>

      {/* Locked sections */}
      <div className="space-y-2">
        {[
          "AI Makeup Studio",
          "Spectacles Guide",
          "Hairstyle & Hair Color",
          "Skin Analysis",
        ].map((section) => (
          <div
            key={section}
            className="flex items-center justify-between rounded-xl px-4 py-2.5"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span className="text-sm text-ink-stone">{section}</span>
            <Lock className="h-3.5 w-3.5" style={{ color: "#C9956B" }} />
          </div>
        ))}
      </div>

      {/* Unlock hint */}
      <div
        className="mt-4 rounded-xl px-4 py-3 text-center"
        style={{
          background:
            "linear-gradient(135deg, rgba(201,149,107,0.1), rgba(232,201,144,0.08))",
          border: "1px solid rgba(201,149,107,0.2)",
        }}
      >
        <p className="text-xs font-medium" style={{ color: "#E8C990" }}>
          Unlock full report — Rs 299 one-time or Rs 999/mo for AI Studio Pro
        </p>
      </div>

      {/* Floating stat badges */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-4 top-1/4 stat-badge min-w-[80px]"
      >
        <p className="font-bold text-lg leading-none" style={{ color: "#C9956B" }}>
          50k+
        </p>
        <p className="text-ink-mist text-xs mt-0.5">Analyses</p>
      </motion.div>
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -left-4 bottom-1/4 stat-badge min-w-[72px]"
      >
        <p className="font-bold text-lg leading-none" style={{ color: "#B8C4CC" }}>
          4.9 ★
        </p>
        <p className="text-ink-mist text-xs mt-0.5">Rating</p>
      </motion.div>
    </motion.div>
  );
}

// ── FAQ accordion ─────────────────────────────────────────────────────────────
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="container max-w-3xl py-24 scroll-mt-16">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
      >
        <motion.h2
          variants={fadeUp}
          className="text-center text-3xl sm:text-4xl text-ink mb-12"
        >
          Frequently asked questions
        </motion.h2>
        <div className="space-y-4">
          {FAQS.map((faq, index) => (
            <motion.div
              key={index}
              variants={fadeUp}
              className="rounded-2xl overflow-hidden"
              style={{
                background:
                  "linear-gradient(145deg, rgba(18,18,26,0.95), rgba(26,26,38,0.9))",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <button
                onClick={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
                className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
              >
                <span className="font-medium text-ink pr-4">{faq.q}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-terracotta transition-transform duration-300 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence initial={false}>
                {openIndex === index && (
                  <motion.div
                    key="answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-6 text-sm text-ink-stone leading-relaxed">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      <MouseGlow />

      {/* Hero */}
      <section className="container max-w-6xl pt-10 pb-16 sm:pt-16 sm:pb-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left copy */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center lg:text-left"
          >
            <AiBadge />

            <motion.h1
              variants={blurIn}
              className="mt-6 text-4xl sm:text-5xl lg:text-6xl text-ink leading-tight"
            >
              Discover the styles that{" "}
              <span className="gradient-text font-bold">flatter you</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-base sm:text-lg text-ink-stone leading-relaxed max-w-xl mx-auto lg:mx-0"
            >
              Upload a selfie and get a full beauty report: face shape, AI
              Makeup Studio, virtual clothing try-on, spectacles guide,
              hairstyle recommendations, and a personalised skin routine — all
              powered by GPT-4o.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-wrap gap-4 justify-center lg:justify-start"
            >
              <Button asChild size="lg" variant="accent" className="group">
                <Link href="/upload">
                  <Camera className="h-4 w-4" />
                  Upload your selfie
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#how">How it works</Link>
              </Button>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="mt-10 flex flex-wrap gap-8 justify-center lg:justify-start text-sm"
            >
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4"
                      style={{ fill: "#E8C990", color: "#E8C990" }}
                    />
                  ))}
                </div>
                <span className="text-ink-stone">4.9 / 5 rating</span>
              </div>
              <div className="flex items-center gap-2 text-ink-stone">
                <CheckCircle2
                  className="h-4 w-4"
                  style={{ color: "#B8C4CC" }}
                />
                50,000+ analyses
              </div>
              <div className="flex items-center gap-2 text-ink-stone">
                <ShieldCheck className="h-4 w-4" style={{ color: "#B8C4CC" }} />
                30-day guarantee
              </div>
            </motion.div>
          </motion.div>

          {/* Right: skeleton to report card */}
          <motion.div
            variants={slideIn("right")}
            initial="hidden"
            animate="visible"
            className="relative px-8 lg:px-4"
          >
            <MockReportCard />
            <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-terracotta/15 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-6 -left-6 w-40 h-40 rounded-full bg-sage/15 blur-2xl pointer-events-none" />
          </motion.div>
        </div>
      </section>

      {/* Face Scan Demo */}
      <section className="container max-w-6xl py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
        >
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <motion.div variants={fadeUp}>
              <p
                className="text-[11px] uppercase tracking-[0.3em] font-semibold mb-3"
                style={{ color: "#C8A96E" }}
              >
                Live Demo
              </p>
              <h2 className="text-3xl sm:text-4xl text-ink mb-4 font-serif">
                See the AI scan your face in real time
              </h2>
              <p className="text-ink-stone leading-relaxed mb-6">
                Click the button to watch the AI scan and identify your face
                shape, colour season, skin undertone, and high-cheekbone
                structure — all in under 3 seconds.
              </p>
              <div className="space-y-3">
                {[
                  {
                    icon: Zap,
                    label: "GPT-4o vision model",
                    sub: "Most advanced multimodal AI",
                  },
                  {
                    icon: ScanFace,
                    label: "AWS Rekognition",
                    sub: "Military-grade face detection",
                  },
                  {
                    icon: Sparkles,
                    label: "50+ style attributes",
                    sub: "Season, undertone, face shape, skin",
                  },
                ].map(({ icon: Icon, label, sub }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-xl px-4 py-3"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(201,149,107,0.12)" }}
                    >
                      <Icon className="h-4 w-4" style={{ color: "#C9956B" }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">{label}</p>
                      <p className="text-xs text-ink-mist">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={scaleIn}>
              <FaceScanDemo />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* How it Works */}
      <section id="how" className="container max-w-6xl py-20 scroll-mt-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl text-ink mb-4">
              How Renovaara works
            </h2>
            <p className="text-ink-stone max-w-2xl mx-auto">
              One selfie. Four steps. A complete personal style profile in
              minutes.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                icon: Camera,
                title: "Upload your selfie",
                desc: "Take or upload a clear, well-lit front-facing photo. No account needed to start.",
                accent: "#C9956B",
              },
              {
                step: "02",
                icon: Sparkles,
                title: "AI reads your features",
                desc: "Face shape, skin tone, undertone, eye shape, and 20+ unique traits analysed by GPT-4o and AWS Rekognition.",
                accent: "#7B6E9E",
              },
              {
                step: "03",
                icon: Wand2,
                title: "Try on looks in the Studio",
                desc: "Pick your lip colour, eyeshadow, blush, and eyeliner — or upload a garment — and generate photorealistic AI previews.",
                accent: "#C9956B",
              },
              {
                step: "04",
                icon: Scissors,
                title: "Download your blueprint",
                desc: "Full spectacles guide, hairstyle recommendations, skin routine, hair-color previews, and a shareable/downloadable PDF.",
                accent: "#7B6E9E",
              },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} className="relative group">
                <div className="card-soft h-full hover:shadow-premium transition-all duration-300 group-hover:-translate-y-2">
                  <div className="mb-5 relative">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${item.accent}22, ${item.accent}44)`,
                        border: `1px solid ${item.accent}44`,
                      }}
                    >
                      <item.icon
                        className="h-6 w-6"
                        style={{ color: item.accent }}
                      />
                    </div>
                    <div
                      className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs"
                      style={{
                        background: "#1A1A26",
                        border: "1px solid rgba(201,149,107,0.3)",
                        color: "#C9956B",
                      }}
                    >
                      {item.step}
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-ink mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-ink-stone leading-relaxed">
                    {item.desc}
                  </p>
                </div>
                {i < 3 && (
                  <div
                    className="hidden lg:flex absolute top-1/3 -right-3 z-10 items-center justify-center w-6 h-6 rounded-full"
                    style={{
                      background: "#1A1A26",
                      border: "1px solid rgba(201,149,107,0.2)",
                    }}
                  >
                    <ArrowRight
                      className="h-3 w-3"
                      style={{ color: "#C9956B" }}
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} className="mt-12 text-center">
            <Button asChild size="lg" variant="accent" className="group">
              <Link href="/upload">
                <Camera className="h-4 w-4" />
                Try it free — no card needed
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Bento Grid features */}
      <section
        id="features"
        className="container max-w-6xl py-20 scroll-mt-16"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={cascadeContainer}
        >
          <motion.div variants={fadeUp} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl text-ink mb-4">
              Everything you need to look your best
            </h2>
            <p className="text-ink-stone max-w-xl mx-auto">
              One selfie. A complete style blueprint personalised to your unique
              features.
            </p>
          </motion.div>
          <BentoGrid />
        </motion.div>
      </section>

      {/* Testimonials */}
      <section className="container max-w-6xl py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.h2
            variants={fadeUp}
            className="text-center text-3xl sm:text-4xl text-ink mb-12"
          >
            Loved by thousands
          </motion.h2>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((testimonial, i) => (
              <motion.div key={i} variants={scaleIn} className="card-soft">
                <div className="flex gap-1 mb-3">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star
                      key={j}
                      className="h-4 w-4"
                      style={{ fill: "#E8C990", color: "#E8C990" }}
                    />
                  ))}
                </div>
                <p className="text-sm text-ink-stone leading-relaxed mb-4">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-obsidian text-sm font-bold"
                    style={{
                      background: "linear-gradient(135deg, #C9956B, #E8C990)",
                    }}
                  >
                    {testimonial.name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-ink text-sm">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-ink-mist">{testimonial.tag}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container max-w-5xl py-20 scroll-mt-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.h2
            variants={fadeUp}
            className="text-center text-3xl sm:text-4xl text-ink mb-4"
          >
            Simple, honest pricing
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-center text-ink-stone mb-12"
          >
            Try it free, upgrade when you&apos;re ready — Transparent pricing,
            no hidden fees
          </motion.p>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Free */}
            <motion.div variants={fadeUp} className="card-soft">
              <p className="text-xs uppercase tracking-widest text-ink-mist mb-2">
                Free preview
              </p>
              <p className="font-serif text-5xl text-ink mb-1">Rs 0</p>
              <p className="text-xs text-ink-mist mb-6">
                No card required — Free forever
              </p>
              <ul className="space-y-3 text-sm text-ink-stone mb-8">
                {[
                  "Face shape identification",
                  "20+ unique facial traits",
                  "Personalised style intro",
                  "Shareable report link",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-sage shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link href="/upload">Try for free</Link>
              </Button>
            </motion.div>

            {/* Full Report */}
            <motion.div
              variants={scaleIn}
              className="card-soft border-0 relative overflow-hidden chrome-border"
            >
              <div
                className="absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full"
                style={{
                  background: "linear-gradient(135deg, #C9956B, #E8C990)",
                  color: "#0A0A0F",
                }}
              >
                POPULAR
              </div>
              <p className="text-xs uppercase tracking-widest text-terracotta mb-2">
                Full Report
              </p>
              <p className="font-serif text-5xl text-ink mb-1">Rs 299</p>
              <p className="text-xs text-ink-mist mb-6">
                One-time — No subscription — 30-day refund guarantee
              </p>
              <ul className="space-y-3 text-sm text-ink-stone mb-8">
                {[
                  "Everything in Free, plus:",
                  "Makeup Studio (5 AI gens)",
                  "Virtual Clothing Try-On",
                  "AI Hair Colour previews",
                  "Spectacles guide",
                  "Skin analysis and routine",
                  "Downloadable PDF",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-sage shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild variant="accent" size="lg" className="w-full">
                <Link href="/upload">Get my report</Link>
              </Button>
            </motion.div>

            {/* Studio Pro */}
            <motion.div
              variants={scaleIn}
              className="card-soft border-0 relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(145deg, rgba(26,20,46,0.98), rgba(18,18,26,0.95))",
                border: "1px solid rgba(123,110,158,0.45)",
              }}
            >
              <div
                className="absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full"
                style={{
                  background: "linear-gradient(135deg, #7B6E9E, #A89CC8)",
                  color: "#0A0A0F",
                }}
              >
                PRO
              </div>
              <p
                className="text-xs uppercase tracking-widest mb-2"
                style={{ color: "#A89CC8" }}
              >
                Studio Pro
              </p>
              <div className="flex items-baseline gap-2 mb-1">
                <p className="font-serif text-5xl text-ink">Rs 999</p>
                <p className="text-xs text-ink-mist">/month</p>
              </div>
              <p className="text-xs text-ink-mist mb-6">
                Monthly subscription — Cancel anytime
              </p>
              <ul className="space-y-3 text-sm text-ink-stone mb-8">
                {[
                  "Everything in Full Report, plus:",
                  "Unlimited reports",
                  "150 AI generations per month",
                  "Priority AI queue",
                  "All future AI Studio features",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2
                      className="h-5 w-5 mt-0.5 shrink-0"
                      style={{ color: "#A89CC8" }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                size="lg"
                className="w-full"
                style={{
                  background: "linear-gradient(135deg, #7B6E9E, #A89CC8)",
                  color: "#0A0A0F",
                }}
              >
                <Link href="/upload">Start Studio Pro</Link>
              </Button>
            </motion.div>
          </div>

          <motion.p
            variants={fadeUp}
            className="mt-8 flex items-center justify-center gap-2 text-sm text-ink-mist"
          >
            <ShieldCheck className="h-4 w-4" />
            Your selfie stays private — encrypted, only you can view your report
            — 30-day money-back guarantee
          </motion.p>
        </motion.div>
      </section>

      {/* FAQ */}
      <FAQSection />

      {/* Final CTA */}
      <section className="container max-w-3xl py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center rounded-3xl p-12"
          style={{
            background:
              "linear-gradient(145deg, rgba(18,18,26,0.98), rgba(26,26,38,0.95))",
            border: "1px solid rgba(201,149,107,0.2)",
          }}
        >
          <motion.h2
            variants={fadeUp}
            className="text-3xl sm:text-4xl text-ink mb-4"
          >
            Ready to discover your style?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-ink-stone mb-8 max-w-xl mx-auto"
          >
            Join thousands who&apos;ve already unlocked their perfect colors,
            styles, and confidence.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Button
              asChild
              size="lg"
              variant="accent"
              className="text-lg px-10 h-14 group"
            >
              <Link href="/upload">
                <Camera className="h-5 w-5" />
                Start your free analysis
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-cream-200 bg-white/50">
        <div className="container max-w-6xl py-12">
          <div className="grid gap-8 md:grid-cols-4 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-terracotta to-camel text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <span className="font-serif text-lg text-ink">Renovaara</span>
              </div>
              <p className="text-sm text-ink-stone leading-relaxed max-w-xs">
                Your AI-powered personal stylist. Discover the colors, cuts, and
                styles that make you look and feel your best.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-mist font-medium mb-4">
                Product
              </p>
              <ul className="space-y-2.5 text-sm text-ink-stone">
                {[
                  { href: "/#how", label: "How it works" },
                  { href: "/#features", label: "Features" },
                  { href: "/#pricing", label: "Pricing" },
                  { href: "/upload", label: "Get started" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="hover:text-ink transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-mist font-medium mb-4">
                Legal
              </p>
              <ul className="space-y-2.5 text-sm text-ink-stone">
                {[
                  { href: "/privacy", label: "Privacy Policy" },
                  { href: "/terms", label: "Terms of Service" },
                  { href: "/refund", label: "Refund Policy" },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="hover:text-ink transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-cream-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-mist">
            <p>
              &copy; {new Date().getFullYear()} Renovaara. All rights reserved.
            </p>
            <p>Powered by GPT-4o &middot; AWS Rekognition &middot; FAL AI</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

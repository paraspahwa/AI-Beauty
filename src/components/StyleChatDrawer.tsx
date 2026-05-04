"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CompiledReport } from "@/types/report";

type Message = { role: "user" | "assistant"; content: string };

interface Props {
  reportId: string;
  report?: Partial<CompiledReport>;
}

// ── Category definitions ────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "wardrobe", label: "👗 Wardrobe" },
  { id: "makeup",   label: "💄 Makeup" },
  { id: "hair",     label: "💇 Hair" },
  { id: "skin",     label: "🧴 Skin" },
  { id: "frames",   label: "👓 Frames" },
  { id: "occasion", label: "🎉 Occasion" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

const STATIC_CATEGORY_QUESTIONS: Record<CategoryId, string[]> = {
  wardrobe: [
    "Build me a capsule wardrobe for my color season",
    "What neutral tones work best for my undertone?",
    "Which patterns suit my style profile?",
  ],
  makeup:   [
    "What lip shades suit my undertone?",
    "Recommend a day-to-night makeup look for my season",
    "What eyeshadow colors complement my eye shape?",
  ],
  hair:     [
    "Would highlights or a balayage work for my coloring?",
    "What length best suits my face shape?",
    "Suggest low-maintenance styles for my hair type",
  ],
  skin:     [
    "What skincare ingredients should I prioritize?",
    "Build me a morning and night routine",
    "How do I handle my biggest skin concern?",
  ],
  frames:   [
    "Which frame colors flatter me most?",
    "Should I choose full-rim or rimless frames?",
    "What frame shape should I avoid?",
  ],
  occasion: [
    "What should I wear to a job interview?",
    "Help me dress for a wedding",
    "Suggest a first-date outfit palette",
  ],
};

// ── Build personalized dynamic chips from the actual report ─────────────────
function buildDynamicSuggestions(report?: Partial<CompiledReport>): string[] {
  if (!report) return [
    "What colors should I wear this season?",
    "Which hairstyle is best for my face shape?",
    "What glasses frames flatter me most?",
    "How should I build my skincare routine?",
  ];

  const chips: string[] = [];

  if (report.colorAnalysis) {
    const { season, undertone, metals } = report.colorAnalysis;
    chips.push(`I'm a ${season} — what are my best power colors?`);
    if (metals?.length) chips.push(`Do ${metals[0]} accessories suit my ${undertone} undertone?`);
  }

  if (report.faceShape) {
    chips.push(`I have a ${report.faceShape.shape} face — which haircuts add the most balance?`);
  }

  if (report.skinAnalysis) {
    const top = report.skinAnalysis.concerns?.[0];
    if (top) chips.push(`What ingredients help with ${top.toLowerCase()}?`);
  }

  if (report.glasses?.recommended?.[0]) {
    chips.push(`Why do ${report.glasses.recommended[0].style} frames suit me?`);
  }

  if (report.hairstyle?.colors?.[0]) {
    chips.push(`Would ${report.hairstyle.colors[0].name} hair color look good on me?`);
  }

  // Pad with generic fallbacks
  if (chips.length < 3) {
    chips.push("Suggest a complete style upgrade plan");
  }

  return chips.slice(0, 5);
}

// ── Component ────────────────────────────────────────────────────────────────
export function StyleChatDrawer({ reportId, report }: Props) {
  const [open, setOpen]       = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your StyleAI consultant — I've read your full report. Ask me anything about your colors, hairstyles, glasses, skincare, or style for any occasion! ✨",
    },
  ]);
  const [input, setInput]     = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [activeCategory, setActiveCategory] = React.useState<CategoryId | "suggested">("suggested");
  const bottomRef  = React.useRef<HTMLDivElement>(null);
  const inputRef   = React.useRef<HTMLTextAreaElement>(null);

  const dynamicSuggestions = React.useMemo(() => buildDynamicSuggestions(report), [report]);

  const visibleChips =
    activeCategory === "suggested"
      ? dynamicSuggestions
      : STATIC_CATEGORY_QUESTIONS[activeCategory];

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  async function send(text?: string) {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;

    setInput("");
    const userMsg: Message = { role: "user", content: userText };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, messages: next }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? "Sorry, something went wrong. Please try again." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error — please try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const showChips = messages.length <= 1;

  return (
    <>
      {/* FAB trigger */}
      <motion.button
        onClick={() => setOpen(true)}
        aria-label="Open style consultant chat"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
        style={{
          background: "linear-gradient(135deg, #C9956B, #E8C990)",
          boxShadow: "0 4px 24px rgba(201,149,107,0.45)",
        }}
      >
        <MessageCircle className="h-6 w-6 text-obsidian" />
      </motion.button>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Panel */}
            <motion.div
              key="panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-md flex-col"
              style={{
                background: "linear-gradient(160deg, #0E0E18 0%, #12121E 100%)",
                borderLeft: "1px solid rgba(255,255,255,0.07)",
                boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ background: "rgba(201,149,107,0.15)" }}
                  >
                    <Sparkles className="h-4 w-4" style={{ color: "#C9956B" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#F0E8D8" }}>
                      Style Consultant
                    </p>
                    <p className="text-xs" style={{ color: "rgba(240,232,216,0.45)" }}>
                      Knows your full style report
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:opacity-80"
                  style={{ color: "rgba(240,232,216,0.5)" }}
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                      style={
                        msg.role === "user"
                          ? {
                              background: "linear-gradient(135deg, #C9956B, #E8C990)",
                              color: "#1A1009",
                              borderBottomRightRadius: 4,
                            }
                          : {
                              background: "rgba(255,255,255,0.06)",
                              color: "rgba(240,232,216,0.9)",
                              border: "1px solid rgba(255,255,255,0.07)",
                              borderBottomLeftRadius: 4,
                            }
                      }
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}

                {/* Category + chip selector — only before first user message */}
                {showChips && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3 pt-1"
                  >
                    {/* Category tabs */}
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setActiveCategory("suggested")}
                        className="rounded-full px-3 py-1 text-xs font-medium transition-all"
                        style={{
                          background: activeCategory === "suggested" ? "rgba(201,149,107,0.25)" : "rgba(255,255,255,0.04)",
                          color: activeCategory === "suggested" ? "#C9956B" : "rgba(240,232,216,0.45)",
                          border: `1px solid ${activeCategory === "suggested" ? "rgba(201,149,107,0.4)" : "rgba(255,255,255,0.08)"}`,
                        }}
                      >
                        ✨ For You
                      </button>
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setActiveCategory(cat.id)}
                          className="rounded-full px-3 py-1 text-xs font-medium transition-all"
                          style={{
                            background: activeCategory === cat.id ? "rgba(201,149,107,0.25)" : "rgba(255,255,255,0.04)",
                            color: activeCategory === cat.id ? "#C9956B" : "rgba(240,232,216,0.45)",
                            border: `1px solid ${activeCategory === cat.id ? "rgba(201,149,107,0.4)" : "rgba(255,255,255,0.08)"}`,
                          }}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Question chips for active category */}
                    <div className="flex flex-wrap gap-2">
                      {visibleChips.map((q) => (
                        <button
                          key={q}
                          onClick={() => send(q)}
                          className="rounded-full px-3 py-1.5 text-xs transition-opacity hover:opacity-80 text-left"
                          style={{
                            background: "rgba(201,149,107,0.12)",
                            color: "#C9956B",
                            border: "1px solid rgba(201,149,107,0.25)",
                          }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Typing indicator */}
                {loading && (
                  <div className="flex justify-start">
                    <div
                      className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="block h-1.5 w-1.5 rounded-full"
                          style={{ background: "#C9956B" }}
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div
                className="px-4 py-4"
                style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div
                  className="flex items-end gap-2 rounded-2xl px-4 py-3"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Ask about your style…"
                    disabled={loading}
                    className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:opacity-40"
                    style={{ color: "#F0E8D8", maxHeight: "6rem" }}
                  />
                  <Button
                    size="sm"
                    variant="accent"
                    onClick={() => send()}
                    disabled={!input.trim() || loading}
                    className="h-8 w-8 shrink-0 p-0 rounded-xl"
                    aria-label="Send message"
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                <p className="mt-2 text-center text-xs" style={{ color: "rgba(240,232,216,0.25)" }}>
                  Powered by StyleAI · Responses are AI-generated
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Sparkles, Bookmark, Trash2, ChevronLeft, Share2, Mic, MicOff } from "lucide-react";
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

// ── Occasion wizard options ──────────────────────────────────────────────────
const OCCASIONS = [
  { label: "💼 Job Interview",    value: "job interview" },
  { label: "💒 Wedding",          value: "wedding" },
  { label: "💕 First Date",       value: "first date" },
  { label: "🎉 Party / Night Out", value: "party or night out" },
  { label: "🏖️ Vacation",         value: "vacation or holiday" },
  { label: "☕ Casual Outing",    value: "casual outing" },
] as const;

// ── Build proactive insight cards from report data (no API call) ─────────────
function buildInsights(report?: Partial<CompiledReport>): string[] {
  if (!report) return [];
  const insights: string[] = [];

  if (report.colorAnalysis) {
    const { season, palette, avoidColors, metals } = report.colorAnalysis;
    const top = palette?.slice(0, 2).map((c) => c.name).join(" and ");
    if (top) insights.push(`✨ As a ${season}, your power shades are **${top}**${metals?.[0] ? ` and ${metals[0]} jewellery` : ""}. Wear these when you want to look your most vibrant.`);
    if (avoidColors?.length) insights.push(`🚫 Steer clear of **${avoidColors[0].name}**${avoidColors[1] ? ` and ${avoidColors[1].name}` : ""} — these clash with your undertone and wash you out.`);
  }

  if (report.faceShape) {
    const shapeInsights: Record<string, string> = {
      Oval:     "You can pull off almost any style — lucky you! Experiment freely.",
      Round:    "Styles with height and length at the crown will elongate your face beautifully.",
      Square:   "Soft, layered cuts and oval or round frames balance your strong jaw perfectly.",
      Heart:    "Volume at the jaw and chin-length cuts balance your wider forehead.",
      Diamond:  "Highlight your cheekbones — side-swept bangs and wider frames suit you best.",
      Oblong:   "Side-swept styles and wider frames add width and balance your length.",
      Triangle: "Volume at the crown and lighter frames at the top draw the eye upward.",
    };
    const tip = shapeInsights[report.faceShape.shape];
    if (tip) insights.push(`💡 **${report.faceShape.shape} face shape tip:** ${tip}`);
  }

  if (report.skinAnalysis?.concerns?.[0]) {
    const concern = report.skinAnalysis.concerns[0].toLowerCase();
    const ingredientMap: Record<string, string> = {
      acne: "niacinamide, salicylic acid, and tea tree",
      "dark spots": "vitamin C, kojic acid, and alpha-arbutin",
      dryness: "hyaluronic acid, ceramides, and squalane",
      redness: "centella asiatica, azelaic acid, and green tea extract",
      aging: "retinol, peptides, and vitamin C",
      oiliness: "niacinamide, zinc, and BHAs",
    };
    const match = Object.keys(ingredientMap).find((k) => concern.includes(k));
    if (match) insights.push(`🧴 For your **${match}** concern, look for products with **${ingredientMap[match]}** — these are your most effective allies.`);
  }

  if (report.hairstyle?.styles?.[0]) {
    insights.push(`💇 Your top recommended style is **${report.hairstyle.styles[0].name}** — ${report.hairstyle.styles[0].description}`);
  }

  return insights.slice(0, 3);
}

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

const GREETING: Message = {
  role: "assistant",
  content:
    "Hi! I'm your StyleAI consultant — I've read your full report. Ask me anything about your colors, hairstyles, glasses, skincare, or style for any occasion! ✨",
};

// ── Share helper — Web Share API with clipboard fallback ─────────────────────
async function shareSnippet(content: string, season?: string): Promise<"shared" | "copied" | "error"> {
  const text = `✨ StyleAI Tip${season ? ` for ${season}` : ""}:\n\n${content}\n\n— Get your own style report at StyleAI`;
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ text });
      return "shared";
    }
  } catch { /* user cancelled or unsupported */ }

  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "error";
  }
}

// ── SpeechRecognition type shim ───────────────────────────────────────────────
type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
type SpeechRecognitionEvent = { results: { [i: number]: { [j: number]: { transcript: string } } } };
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

// ── Component ────────────────────────────────────────────────────────────────
export function StyleChatDrawer({ reportId, report }: Props) {
  const searchParams = useSearchParams();
  const [open, setOpen]         = React.useState(() => searchParams.get("chat") === "1");
  const [messages, setMessages] = React.useState<Message[]>([GREETING]);
  const [input, setInput]       = React.useState("");
  const [loading, setLoading]   = React.useState(false);
  const [historyLoaded, setHistoryLoaded] = React.useState(false);
  const [drawerView, setDrawerView]           = React.useState<"chat" | "tips">("chat");
  const [bookmarks, setBookmarks]             = React.useState<{ id: string; content: string }[]>([]);
  const [bookmarksLoaded, setBookmarksLoaded] = React.useState(false);
  const [bookmarking, setBookmarking]         = React.useState<number | null>(null);
  const [sharing, setSharing]                 = React.useState<number | "bk" | null>(null);
  const [shareToast, setShareToast]           = React.useState<string | null>(null);
  const [isListening, setIsListening]         = React.useState(false);
  const [voiceSupported, setVoiceSupported]   = React.useState(false);
  const recognitionRef = React.useRef<SpeechRecognitionInstance | null>(null);
  const [occasionStep, setOccasionStep]       = React.useState<{ occasion: string } | null>(null);
  const [activeCategory, setActiveCategory]   = React.useState<CategoryId | "suggested">("suggested");
  const bottomRef  = React.useRef<HTMLDivElement>(null);
  const inputRef   = React.useRef<HTMLTextAreaElement>(null);

  const dynamicSuggestions = React.useMemo(() => buildDynamicSuggestions(report), [report]);
  const proactiveInsights  = React.useMemo(() => buildInsights(report), [report]);

  const visibleChips =
    activeCategory === "suggested"
      ? dynamicSuggestions
      : STATIC_CATEGORY_QUESTIONS[activeCategory];

  // Load persisted chat history once on first open
  React.useEffect(() => {
    if (!open || historyLoaded) return;
    setHistoryLoaded(true);

    fetch(`/api/chat?reportId=${reportId}`)
      .then((r) => r.json())
      .then((data: { messages?: Message[] }) => {
        if (data.messages && data.messages.length > 0) {
          // Restore full history — replace the greeting with actual history
          setMessages(data.messages);
        }
        // else: no history yet — keep greeting + show insights
      })
      .catch(() => {/* silently keep greeting */});
  }, [open, historyLoaded, reportId]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // Reset occasion wizard when user switches category
  React.useEffect(() => { setOccasionStep(null); }, [activeCategory]);

  // Load bookmarks on first switch to tips view
  React.useEffect(() => {
    if (drawerView !== "tips" || bookmarksLoaded) return;
    setBookmarksLoaded(true);
    fetch(`/api/chat/bookmarks?reportId=${reportId}`)
      .then((r) => r.json())
      .then((d: { bookmarks?: { id: string; content: string }[] }) => {
        if (d.bookmarks) setBookmarks(d.bookmarks);
      })
      .catch(() => {});
  }, [drawerView, bookmarksLoaded, reportId]);

  // Detect SpeechRecognition support on mount
  React.useEffect(() => {
    if (typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
      setVoiceSupported(true);
    }
  }, []);

  // Auto-dismiss share toast
  React.useEffect(() => {
    if (!shareToast) return;
    const t = setTimeout(() => setShareToast(null), 2500);
    return () => clearTimeout(t);
  }, [shareToast]);

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

  async function bookmarkMessage(content: string, msgIdx: number) {
    if (bookmarking !== null) return;
    setBookmarking(msgIdx);
    try {
      const res = await fetch("/api/chat/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, content }),
      });
      const data = (await res.json()) as { bookmark?: { id: string; content: string } };
      if (data.bookmark) setBookmarks((prev) => [data.bookmark!, ...prev]);
    } catch { /* ignore */ }
    setBookmarking(null);
  }

  function removeBookmark(id: string) {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    fetch(`/api/chat/bookmarks/${id}`, { method: "DELETE" }).catch(() => {});
  }

  function toggleVoice() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      if (transcript) setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    rec.onerror = () => setIsListening(false);
    rec.onend   = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }

  async function shareMessage(content: string, idx: number | "bk") {
    if (sharing !== null) return;
    setSharing(idx);
    const result = await shareSnippet(content, report?.colorAnalysis?.season);
    setSharing(null);
    if (result === "shared") setShareToast("Shared! ✨");
    else if (result === "copied") setShareToast("Copied to clipboard! 📋");
  }

  function sendOccasionPrompt(venue: "indoor" | "outdoor") {
    if (!occasionStep) return;
    const { occasion } = occasionStep;
    setOccasionStep(null);
    send(
      `Plan my complete look for a ${occasion} (${venue}). Based on my full style profile, give me: ` +
      `the best outfit color palette, which accessories and metals to wear, ` +
      `makeup tone and approach, and hairstyle recommendation.`,
    );
  }

  const showChips    = messages.length <= 1;
  const showInsights = showChips && proactiveInsights.length > 0;

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
                {drawerView === "tips" ? (
                  <button
                    onClick={() => setDrawerView("chat")}
                    className="flex items-center gap-2 text-sm font-semibold"
                    style={{ color: "#F0E8D8" }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    My Saved Tips
                    {bookmarks.length > 0 && (
                      <span
                        className="ml-1 rounded-full px-1.5 py-0.5 text-xs font-medium"
                        style={{ background: "rgba(201,149,107,0.2)", color: "#C9956B" }}
                      >
                        {bookmarks.length}
                      </span>
                    )}
                  </button>
                ) : (
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
                )}

                <div className="flex items-center gap-2">
                  {drawerView === "chat" && (
                    <button
                      onClick={() => setDrawerView("tips")}
                      className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:opacity-80"
                      style={{ color: "rgba(240,232,216,0.5)" }}
                      aria-label="View saved tips"
                      title="My Saved Tips"
                    >
                      <Bookmark className="h-4 w-4" />
                      {bookmarks.length > 0 && (
                        <span
                          className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
                          style={{ background: "#C9956B", color: "#1A1009" }}
                        >
                          {bookmarks.length > 9 ? "9+" : bookmarks.length}
                        </span>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:opacity-80"
                    style={{ color: "rgba(240,232,216,0.5)" }}
                    aria-label="Close chat"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* ── Tips view ──────────────────────────────────────────── */}
              {drawerView === "tips" && (
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                  {bookmarks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
                      <Bookmark className="h-10 w-10 opacity-20" style={{ color: "#C9956B" }} />
                      <p className="text-sm text-center" style={{ color: "rgba(240,232,216,0.4)" }}>
                        No saved tips yet.
                        <br />Pin any assistant reply with the 📌 button.
                      </p>
                    </div>
                  ) : (
                    bookmarks.map((bk) => (
                      <motion.div
                        key={bk.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl px-4 py-3 text-sm leading-relaxed relative group"
                        style={{
                          background: "rgba(201,149,107,0.08)",
                          border: "1px solid rgba(201,149,107,0.2)",
                          color: "rgba(240,232,216,0.88)",
                        }}
                      >
                        {bk.content}
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => shareMessage(bk.content, "bk")}
                            disabled={sharing === "bk"}
                            className="flex h-6 w-6 items-center justify-center rounded-lg"
                            style={{ color: "#C9956B" }}
                            aria-label="Share tip"
                            title="Share"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => removeBookmark(bk.id)}
                            className="flex h-6 w-6 items-center justify-center rounded-lg"
                            style={{ color: "rgba(240,100,100,0.7)" }}
                            aria-label="Remove tip"
                            title="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}

              {/* ── Chat view ───────────────────────────────────────────── */}
              {drawerView === "chat" && (
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
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
                    {/* Pin + Share buttons — only on non-greeting assistant messages */}
                    {msg.role === "assistant" && i > 0 && (
                      <div className="mt-1 flex items-center gap-3">
                        <button
                          onClick={() => bookmarkMessage(msg.content, i)}
                          disabled={bookmarking === i}
                          className="flex items-center gap-1 text-xs transition-opacity opacity-30 hover:opacity-100"
                          style={{ color: "#C9956B" }}
                          title="Save this tip"
                        >
                          {bookmarking === i
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Bookmark className="h-3 w-3" />
                          }
                          <span>Save</span>
                        </button>
                        <button
                          onClick={() => shareMessage(msg.content, i)}
                          disabled={sharing === i}
                          className="flex items-center gap-1 text-xs transition-opacity opacity-30 hover:opacity-100"
                          style={{ color: "#C9956B" }}
                          title="Share this tip"
                        >
                          {sharing === i
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Share2 className="h-3 w-3" />
                          }
                          <span>Share</span>
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Proactive insight cards — shown before first user message */}
                {showInsights && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="space-y-2 pt-1"
                  >
                    <p className="text-xs px-1" style={{ color: "rgba(240,232,216,0.35)" }}>
                      Insights from your report
                    </p>
                    {proactiveInsights.map((insight, i) => (
                      <button
                        key={i}
                        onClick={() => send(insight.replace(/\*\*/g, ""))}
                        className="w-full text-left rounded-2xl px-4 py-3 text-xs leading-relaxed transition-opacity hover:opacity-80"
                        style={{
                          background: "rgba(201,149,107,0.08)",
                          border: "1px solid rgba(201,149,107,0.2)",
                          color: "rgba(240,232,216,0.85)",
                          borderBottomLeftRadius: 4,
                        }}
                      >
                        {insight}
                      </button>
                    ))}
                  </motion.div>
                )}

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

                    {/* Question chips — occasion category gets the wizard */}
                    <div className="flex flex-wrap gap-2">
                      {activeCategory === "occasion" ? (
                        occasionStep ? (
                          // Step 2: Indoor or outdoor?
                          <div className="w-full space-y-2">
                            <p className="text-xs px-1" style={{ color: "rgba(240,232,216,0.4)" }}>
                              {occasionStep.occasion} — indoor or outdoor?
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {(["indoor", "outdoor"] as const).map((venue) => (
                                <button
                                  key={venue}
                                  onClick={() => sendOccasionPrompt(venue)}
                                  className="rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-opacity hover:opacity-80"
                                  style={{ background: "rgba(201,149,107,0.2)", color: "#C9956B", border: "1px solid rgba(201,149,107,0.35)" }}
                                >
                                  {venue === "indoor" ? "🏛️ Indoor" : "🌿 Outdoor"}
                                </button>
                              ))}
                              <button
                                onClick={() => setOccasionStep(null)}
                                className="rounded-full px-3 py-1.5 text-xs transition-opacity hover:opacity-80"
                                style={{ color: "rgba(240,232,216,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}
                              >
                                ← Back
                              </button>
                            </div>
                          </div>
                        ) : (
                          // Step 1: Pick occasion type
                          OCCASIONS.map((occ) => (
                            <button
                              key={occ.value}
                              onClick={() => setOccasionStep({ occasion: occ.value })}
                              className="rounded-full px-3 py-1.5 text-xs transition-opacity hover:opacity-80 text-left"
                              style={{ background: "rgba(201,149,107,0.12)", color: "#C9956B", border: "1px solid rgba(201,149,107,0.25)" }}
                            >
                              {occ.label}
                            </button>
                          ))
                        )
                      ) : (
                        visibleChips.map((q) => (
                          <button
                            key={q}
                            onClick={() => send(q)}
                            className="rounded-full px-3 py-1.5 text-xs transition-opacity hover:opacity-80 text-left"
                            style={{ background: "rgba(201,149,107,0.12)", color: "#C9956B", border: "1px solid rgba(201,149,107,0.25)" }}
                          >
                            {q}
                          </button>
                        ))
                      )}
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
              )} {/* end chat view */}

              {/* Input — only shown in chat view */}
              {drawerView === "chat" && (
              <div
                className="px-4 py-4"
                style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
              >
                {/* Share / copy toast */}
                <AnimatePresence>
                  {shareToast && (
                    <motion.p
                      key="toast"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="mb-2 text-center text-xs font-medium rounded-xl py-1"
                      style={{ background: "rgba(201,149,107,0.2)", color: "#E8C990" }}
                    >
                      {shareToast}
                    </motion.p>
                  )}
                </AnimatePresence>
                <div
                  className="flex items-end gap-2 rounded-2xl px-4 py-3"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {/* Mic button */}
                  {voiceSupported && (
                    <button
                      onClick={toggleVoice}
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl transition-all"
                      style={{
                        background: isListening ? "rgba(201,149,107,0.3)" : "transparent",
                        color: isListening ? "#E8C990" : "rgba(240,232,216,0.4)",
                      }}
                      title={isListening ? "Stop recording" : "Voice input"}
                      aria-label={isListening ? "Stop voice input" : "Start voice input"}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  )}
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder={isListening ? "Listening…" : "Ask about your style…"}
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
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

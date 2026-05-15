"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { track } from "@/lib/track";

type Message = { role: "user" | "assistant"; content: string };

const QUICK_STARTERS = [
  "What does Renovaara do?",
  "What's included in the free analysis?",
  "How accurate is the AI?",
  "Is my photo kept private?",
  "What's in the Full Report?",
  "Do you offer a refund?",
];

const GREETING: Message = {
  role: "assistant",
  content:
    "Hi! I'm Aria, Renovaara's style assistant 👋 I can answer any questions about how the analysis works, what's included, or pricing. What would you like to know?",
};

/** Detect if the reply is likely a conversion moment — show a CTA button */
function shouldShowCta(reply: string): boolean {
  const triggers = [
    "free analysis", "free preview", "free report", "no card required",
    "rs 299", "full report", "paid plan", "30-day", "money-back",
    "start", "upload", "try",
  ];
  const lower = reply.toLowerCase();
  return triggers.some((t) => lower.includes(t));
}

export function VisitorChatWidget() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([GREETING]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Scroll to bottom whenever messages change
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
      track("visitor_chat_open");
    }
  }, [open]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    track("visitor_chat_message", { question: trimmed.slice(0, 60) });

    try {
      const res = await fetch("/api/chat/visitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setMessages((m) => [
          ...m,
          { role: "assistant", content: err.error ?? "Something went wrong. Please try again." },
        ]);
        return;
      }

      const data = (await res.json()) as { reply?: string };
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply ?? "I'm not sure — want to try the free analysis?" },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Network error. Please check your connection and try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void sendMessage(input);
  }

  return (
    <>
      {/* ── Floating bubble ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {open && (
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-[340px] sm:w-[380px] rounded-2xl border border-terracotta/20 bg-white shadow-2xl flex flex-col overflow-hidden"
              style={{ maxHeight: "min(520px, 80vh)" }}
            >
              {/* Header */}
              <div className="flex items-center gap-2.5 border-b border-terracotta/10 bg-gradient-to-r from-terracotta/10 to-iris/10 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-terracotta/15 text-terracotta">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink leading-none">Aria</p>
                  <p className="text-xs text-ink-stone mt-0.5">Renovaara style assistant</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-ink-mist hover:text-ink hover:bg-black/5 transition-colors"
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Message list */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-terracotta text-white rounded-br-sm"
                          : "bg-obsidian text-ink rounded-bl-sm border border-terracotta/10"
                      }`}
                    >
                      {msg.content}

                      {/* CTA button on assistant messages that mention conversion triggers */}
                      {msg.role === "assistant" && shouldShowCta(msg.content) && (
                        <div className="mt-2.5">
                          <Link
                            href="/upload"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-terracotta/15 px-3 py-1.5 text-xs font-semibold text-terracotta hover:bg-terracotta/25 transition-colors"
                            onClick={() => track("visitor_chat_cta_click")}
                          >
                            Start free analysis
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-sm bg-obsidian border border-terracotta/10 px-4 py-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-terracotta" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick starters — show only when just greeting shown */}
              {messages.length === 1 && (
                <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                  {QUICK_STARTERS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void sendMessage(q)}
                      className="rounded-full border border-terracotta/25 bg-terracotta/8 px-2.5 py-1 text-xs text-ink-stone hover:border-terracotta/50 hover:text-ink transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <form
                onSubmit={handleSubmit}
                className="border-t border-terracotta/10 flex items-center gap-2 px-3 py-2.5"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything about Renovaara…"
                  maxLength={500}
                  className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-mist outline-none"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-terracotta text-white disabled:opacity-40 hover:bg-terracotta/90 transition-colors shrink-0"
                  aria-label="Send"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bubble toggle */}
        <motion.button
          onClick={() => setOpen((o) => !o)}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-terracotta text-white shadow-lg hover:bg-terracotta/90 transition-colors"
          aria-label={open ? "Close chat" : "Chat with Aria"}
        >
          <AnimatePresence mode="wait" initial={false}>
            {open ? (
              <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <X className="h-6 w-6" />
              </motion.span>
            ) : (
              <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <MessageCircle className="h-6 w-6" />
              </motion.span>
            )}
          </AnimatePresence>

          {/* Pulse dot — draws attention on first visit */}
          {!open && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-iris opacity-60" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-iris" />
            </span>
          )}
        </motion.button>
      </div>
    </>
  );
}

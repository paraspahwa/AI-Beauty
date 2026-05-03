"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type Message = { role: "user" | "assistant"; content: string };

interface Props {
  reportId: string;
}

const SUGGESTED = [
  "What colors should I wear this season?",
  "Which hairstyle is best for my face shape?",
  "What glasses frames flatter me most?",
  "How should I build my skincare routine?",
];

export function StyleChatDrawer({ reportId }: Props) {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your StyleAI consultant. Ask me anything about your report — colors, hairstyles, glasses, skincare, or anything style-related! ✨",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Focus input when drawer opens
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

  const hasSuggestions = messages.length <= 1;

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
                      Ask anything about your report
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

                {/* Suggested questions — only on first load */}
                {hasSuggestions && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-wrap gap-2 pt-1"
                  >
                    {SUGGESTED.map((q) => (
                      <button
                        key={q}
                        onClick={() => send(q)}
                        className="rounded-full px-3 py-1.5 text-xs transition-opacity hover:opacity-80"
                        style={{
                          background: "rgba(201,149,107,0.12)",
                          color: "#C9956B",
                          border: "1px solid rgba(201,149,107,0.25)",
                        }}
                      >
                        {q}
                      </button>
                    ))}
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

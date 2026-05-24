import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { fetchChatHistory, fetchReport, type MobileChatMessage, type MobileReport, sendChatMessage } from "@/lib/api";

function buildChatSuggestions(report: MobileReport | null): string[] {
  const suggestions: string[] = [];

  if (report?.colorAnalysis?.season) {
    suggestions.push(`What outfits suit my ${report.colorAnalysis.season} palette?`);
  }
  if (report?.faceShape?.shape) {
    suggestions.push(`Which haircut flatters my ${report.faceShape.shape} face shape most?`);
  }
  if (report?.glasses?.recommended?.[0]?.style) {
    suggestions.push(`Why do ${report.glasses.recommended[0].style} frames suit me?`);
  }
  if (report?.skinAnalysis?.type) {
    suggestions.push(`Build a simple routine for my ${report.skinAnalysis.type} skin.`);
  }

  if (suggestions.length === 0) {
    suggestions.push("Give me a quick style upgrade plan.");
  }

  return suggestions.slice(0, 4);
}

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const scrollRef = useRef<ScrollView | null>(null);
  const [report, setReport] = useState<MobileReport | null>(null);
  const [messages, setMessages] = useState<MobileChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const suggestions = useMemo(() => buildChatSuggestions(report), [report]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (!params.id) throw new Error("Missing report id");
        setError(null);
        const [nextReport, history] = await Promise.all([
          fetchReport(params.id),
          fetchChatHistory(params.id),
        ]);
        if (!cancelled) {
          setReport(nextReport);
          setMessages(history);
        }
      } catch (err) {
        if (!cancelled) {
          setError(String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [params.id, reloadToken]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, sending]);

  async function handleSendMessage(prefill?: string) {
    try {
      if (!params.id) throw new Error("Missing report id");
      const content = (prefill ?? input).trim();
      if (!content) return;

      const nextMessages = [...messages, { role: "user", content } satisfies MobileChatMessage];
      setMessages(nextMessages);
      setInput("");
      setSending(true);

      const response = await sendChatMessage(params.id, nextMessages);
      setMessages([...nextMessages, { role: "assistant", content: response.reply }]);
    } catch (err) {
      Alert.alert("Chat unavailable", String(err));
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#111827" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Unable to load chat</Text>
        <Text style={styles.helper}>{error}</Text>
        <Pressable onPress={() => { setLoading(true); setReloadToken((value) => value + 1); }} style={styles.retryButton}>
          <Text style={styles.retryButtonLabel}>Try again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonLabel}>Back</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Style consultant</Text>
          <Text style={styles.helper}>Ask follow-up questions from your Renovaara report.</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        <View style={styles.suggestionRow}>
          {suggestions.map((item) => (
            <Pressable key={item} onPress={() => void handleSendMessage(item)} style={styles.suggestionChip}>
              <Text style={styles.suggestionLabel}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.thread}>
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.helper}>No messages yet. Start with one of the prompts above.</Text>
            </View>
          ) : (
            messages.map((message, index) => (
              <View
                key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
                style={[styles.bubble, message.role === "user" ? styles.userBubble : styles.assistantBubble]}
              >
                <Text style={[styles.roleLabel, message.role === "user" ? styles.userRoleLabel : null]}>
                  {message.role === "user" ? "You" : "Consultant"}
                </Text>
                <Text style={[styles.messageText, message.role === "user" ? styles.userMessageText : null]}>
                  {message.content}
                </Text>
              </View>
            ))
          )}
          {sending ? (
            <View style={styles.sendingRow}>
              <ActivityIndicator size="small" color="#111827" />
              <Text style={styles.helper}>Consultant is thinking...</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask about outfits, makeup, hair, or skin..."
          style={styles.input}
          multiline
        />
        <Pressable
          onPress={() => void handleSendMessage()}
          disabled={sending || input.trim().length === 0}
          style={[styles.sendButton, sending || input.trim().length === 0 ? styles.disabledButton : null]}
        >
          <Text style={styles.sendButtonLabel}>{sending ? "Sending..." : "Send"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fffafc",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fffafc",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  headerCopy: {
    gap: 4,
  },
  backButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonLabel: {
    color: "#111827",
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  helper: {
    color: "#6b7280",
    lineHeight: 21,
  },
  retryButton: {
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  retryButtonLabel: {
    color: "#ffffff",
    fontWeight: "700",
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  suggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionChip: {
    borderRadius: 999,
    backgroundColor: "#fdf2f8",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  suggestionLabel: {
    color: "#9d174d",
    fontSize: 12,
    fontWeight: "600",
  },
  thread: {
    gap: 10,
  },
  sendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  emptyState: {
    borderRadius: 18,
    backgroundColor: "#ffffff",
    padding: 16,
  },
  bubble: {
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  userBubble: {
    backgroundColor: "#111827",
    alignSelf: "flex-end",
    maxWidth: "90%",
  },
  assistantBubble: {
    backgroundColor: "#ffffff",
    alignSelf: "stretch",
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#6b7280",
  },
  userRoleLabel: {
    color: "rgba(255,255,255,0.7)",
  },
  messageText: {
    color: "#111827",
    lineHeight: 21,
  },
  userMessageText: {
    color: "#ffffff",
  },
  composer: {
    padding: 20,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#fffafc",
  },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    textAlignVertical: "top",
    backgroundColor: "#ffffff",
  },
  sendButton: {
    borderRadius: 14,
    backgroundColor: "#111827",
    paddingVertical: 12,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.45,
  },
  sendButtonLabel: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
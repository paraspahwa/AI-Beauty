import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { analyzeIngredients, deleteChatBookmark, fetchChatBookmarks, fetchChatHistory, fetchReport, saveChatBookmark, type MobileChatBookmark, type MobileChatMessage, type MobileIngredientAnalysis, type MobileReport, sendChatMessage } from "@/lib/api";
import { mobileTheme as t } from "@/lib/theme";

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
  const [bookmarks, setBookmarks] = useState<MobileChatBookmark[]>([]);
  const [savingBookmarkFor, setSavingBookmarkFor] = useState<number | null>(null);
  const [ingredientInput, setIngredientInput] = useState("");
  const [ingredientLoading, setIngredientLoading] = useState(false);
  const [ingredientResult, setIngredientResult] = useState<MobileIngredientAnalysis | null>(null);
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
        const nextBookmarks = await fetchChatBookmarks(params.id).catch(() => []);
        if (!cancelled) {
          setReport(nextReport);
          setMessages(history);
          setBookmarks(nextBookmarks);
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

  async function handleSaveBookmark(message: MobileChatMessage, index: number) {
    try {
      if (!params.id) throw new Error("Missing report id");
      if (message.role !== "assistant") return;
      setSavingBookmarkFor(index);
      const bookmark = await saveChatBookmark(params.id, message.content);
      setBookmarks((prev) => [bookmark, ...prev.filter((item) => item.id !== bookmark.id)]);
    } catch (err) {
      Alert.alert("Save bookmark", String(err));
    } finally {
      setSavingBookmarkFor(null);
    }
  }

  async function handleRemoveBookmark(bookmarkId: string) {
    try {
      await deleteChatBookmark(bookmarkId);
      setBookmarks((prev) => prev.filter((item) => item.id !== bookmarkId));
    } catch (err) {
      Alert.alert("Remove bookmark", String(err));
    }
  }

  async function handleShareSnippet(content: string) {
    try {
      await Share.share({ message: content });
    } catch (err) {
      Alert.alert("Share", String(err));
    }
  }

  async function handleAnalyzeIngredients() {
    try {
      const payload = ingredientInput.trim();
      if (payload.length < 10) {
        Alert.alert("Ingredient analysis", "Please paste a longer ingredient list.");
        return;
      }

      setIngredientLoading(true);
      const result = await analyzeIngredients(payload, report?.skinAnalysis?.type
        ? {
            type: report.skinAnalysis.type,
            concerns: report.skinAnalysis.concerns?.map((item) => item.label) ?? [],
          }
        : undefined);
      setIngredientResult(result);
    } catch (err) {
      Alert.alert("Ingredient analysis", String(err));
    } finally {
      setIngredientLoading(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={t.color.text} />
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
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Saved tips</Text>
          {!bookmarks.length ? (
            <Text style={styles.helper}>Bookmark assistant replies to save your favorite guidance.</Text>
          ) : (
            <View style={styles.bookmarkList}>
              {bookmarks.slice(0, 6).map((bookmark) => (
                <View key={bookmark.id} style={styles.bookmarkCard}>
                  <Text style={styles.bookmarkText} numberOfLines={4}>{bookmark.content}</Text>
                  <View style={styles.bookmarkActions}>
                    <Pressable
                      onPress={() => {
                        setInput(bookmark.content);
                        scrollRef.current?.scrollToEnd({ animated: true });
                      }}
                      style={styles.bookmarkActionButton}
                    >
                      <Text style={styles.bookmarkActionLabel}>Reuse</Text>
                    </Pressable>
                    <Pressable onPress={() => void handleShareSnippet(bookmark.content)} style={styles.bookmarkActionButton}>
                      <Text style={styles.bookmarkActionLabel}>Share</Text>
                    </Pressable>
                    <Pressable onPress={() => void handleRemoveBookmark(bookmark.id)} style={styles.bookmarkDeleteButton}>
                      <Text style={styles.bookmarkDeleteLabel}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ingredient analyzer</Text>
          <Text style={styles.helper}>Paste a product ingredient list and get a quick suitability read based on your profile.</Text>
          <TextInput
            value={ingredientInput}
            onChangeText={setIngredientInput}
            placeholder="Paste ingredient list..."
            style={styles.ingredientInput}
            multiline
          />
          <Pressable
            onPress={() => void handleAnalyzeIngredients()}
            disabled={ingredientLoading || ingredientInput.trim().length < 10}
            style={[styles.secondarySendButton, ingredientLoading || ingredientInput.trim().length < 10 ? styles.disabledButton : null]}
          >
            <Text style={styles.sendButtonLabel}>{ingredientLoading ? "Analyzing..." : "Analyze ingredients"}</Text>
          </Pressable>

          {ingredientResult ? (
            <View style={styles.ingredientResultCard}>
              <Text style={styles.ingredientScore}>Score: {ingredientResult.overallScore}/10</Text>
              <Text style={styles.helper}>{ingredientResult.summary}</Text>
              {ingredientResult.highlights?.length ? <Text style={styles.helper}>Highlights: {ingredientResult.highlights.join(" • ")}</Text> : null}
              {ingredientResult.concerns?.length ? <Text style={styles.helper}>Concerns: {ingredientResult.concerns.join(" • ")}</Text> : null}
            </View>
          ) : null}
        </View>

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
                {message.role === "assistant" ? (
                  <View style={styles.inlineActionRow}>
                    <Pressable
                      onPress={() => void handleSaveBookmark(message, index)}
                      disabled={savingBookmarkFor === index}
                      style={[styles.bookmarkInlineButton, savingBookmarkFor === index ? styles.disabledButton : null]}
                    >
                      <Text style={styles.bookmarkInlineLabel}>{savingBookmarkFor === index ? "Saving..." : "Bookmark"}</Text>
                    </Pressable>
                    <Pressable onPress={() => void handleShareSnippet(message.content)} style={styles.bookmarkInlineButton}>
                      <Text style={styles.bookmarkInlineLabel}>Share</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))
          )}
          {sending ? (
            <View style={styles.sendingRow}>
              <ActivityIndicator size="small" color={t.color.text} />
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
    backgroundColor: t.color.bg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: t.color.bg,
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
    backgroundColor: t.color.surfaceSubtle,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonLabel: {
    color: t.color.text,
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: t.color.text,
  },
  helper: {
    color: t.color.textMuted,
    lineHeight: 21,
  },
  retryButton: {
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: t.color.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  retryButtonLabel: {
    color: t.color.textOnDark,
    fontWeight: "700",
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  sectionCard: {
    borderRadius: 18,
    backgroundColor: t.color.surface,
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: t.color.text,
  },
  bookmarkList: {
    gap: 8,
  },
  bookmarkCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.color.divider,
    padding: 10,
    gap: 8,
    backgroundColor: t.color.bg,
  },
  bookmarkText: {
    color: t.color.textSoft,
    lineHeight: 20,
  },
  bookmarkActions: {
    flexDirection: "row",
    gap: 8,
  },
  bookmarkActionButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.color.borderStrong,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: t.color.surface,
  },
  bookmarkActionLabel: {
    color: t.color.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  bookmarkDeleteButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.color.dangerBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: t.color.dangerSurface,
  },
  bookmarkDeleteLabel: {
    color: t.color.danger,
    fontSize: 12,
    fontWeight: "700",
  },
  ingredientInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: t.color.border,
    borderRadius: 12,
    backgroundColor: t.color.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
  },
  secondarySendButton: {
    borderRadius: 12,
    backgroundColor: t.color.text,
    paddingVertical: 11,
    alignItems: "center",
  },
  ingredientResultCard: {
    borderRadius: 12,
    backgroundColor: t.color.surfaceMuted,
    borderWidth: 1,
    borderColor: t.color.border,
    padding: 10,
    gap: 6,
  },
  ingredientScore: {
    color: t.color.text,
    fontWeight: "700",
  },
  suggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionChip: {
    borderRadius: 999,
    backgroundColor: t.color.brandRoseSurface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  suggestionLabel: {
    color: t.color.brandRose,
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
    backgroundColor: t.color.surface,
    padding: 16,
  },
  bubble: {
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  userBubble: {
    backgroundColor: t.color.text,
    alignSelf: "flex-end",
    maxWidth: "90%",
  },
  assistantBubble: {
    backgroundColor: t.color.surface,
    alignSelf: "stretch",
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    color: t.color.textMuted,
  },
  userRoleLabel: {
    color: "rgba(255,255,255,0.7)",
  },
  messageText: {
    color: t.color.text,
    lineHeight: 21,
  },
  inlineActionRow: {
    marginTop: 2,
    flexDirection: "row",
    gap: 8,
  },
  bookmarkInlineButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  bookmarkInlineLabel: {
    color: t.color.textSoft,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  userMessageText: {
    color: t.color.textOnDark,
  },
  composer: {
    padding: 20,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: t.color.divider,
    backgroundColor: t.color.bg,
  },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: t.color.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    textAlignVertical: "top",
    backgroundColor: t.color.surface,
  },
  sendButton: {
    borderRadius: 14,
    backgroundColor: t.color.text,
    paddingVertical: 12,
    alignItems: "center",
  },
  disabledButton: {
    opacity: t.opacity.disabled,
  },
  sendButtonLabel: {
    color: t.color.textOnDark,
    fontWeight: "700",
  },
});

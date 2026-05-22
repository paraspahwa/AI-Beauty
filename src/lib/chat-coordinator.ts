export type ChatWidgetId = "aria-sales" | "style-consultant";

const CHAT_OPENED_EVENT = "renovaara:chat-opened";

type ChatOpenedDetail = { id: ChatWidgetId };

export const CHAT_DOCK = {
  styleConsultantFab: "fixed bottom-6 right-6 z-40",
  // Keep Aria lifted above the style consultant FAB to avoid bottom-right overlap.
  ariaSalesContainer: "fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2.5 sm:right-6 sm:bottom-24",
} as const;

export function announceChatOpened(id: ChatWidgetId): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ChatOpenedDetail>(CHAT_OPENED_EVENT, { detail: { id } }));
}

export function subscribeToOtherChatOpen(
  id: ChatWidgetId,
  onOtherChatOpened: () => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    const custom = event as CustomEvent<ChatOpenedDetail>;
    if (!custom.detail || custom.detail.id === id) return;
    onOtherChatOpened();
  };

  window.addEventListener(CHAT_OPENED_EVENT, handler as EventListener);
  return () => window.removeEventListener(CHAT_OPENED_EVENT, handler as EventListener);
}

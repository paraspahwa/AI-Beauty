import AsyncStorage from "@react-native-async-storage/async-storage";

export type StudioHistoryKind = "makeup" | "hair" | "glasses";

export type StudioHistoryItem = {
  id: string;
  imageUrl: string;
  createdAt: string;
  label?: string;
};

export type SavedVisual = {
  id: string;
  kind: StudioHistoryKind;
  imageUrl: string;
  createdAt: string;
  label?: string;
};

const HISTORY_LIMIT = 8;
const SAVED_VISUALS_LIMIT = 6;

function historyKey(kind: StudioHistoryKind, reportId: string): string {
  return `studio_history:${kind}:${reportId}`;
}

function savedVisualsKey(reportId: string): string {
  return `saved_visuals:${reportId}`;
}

export async function loadStudioHistory(kind: StudioHistoryKind, reportId: string): Promise<StudioHistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(historyKey(kind, reportId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StudioHistoryItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => Boolean(item?.id && item?.imageUrl));
  } catch {
    return [];
  }
}

export async function pushStudioHistoryItem(kind: StudioHistoryKind, reportId: string, item: StudioHistoryItem): Promise<StudioHistoryItem[]> {
  const current = await loadStudioHistory(kind, reportId);
  const next = [item, ...current.filter((entry) => entry.id !== item.id)].slice(0, HISTORY_LIMIT);
  await AsyncStorage.setItem(historyKey(kind, reportId), JSON.stringify(next));
  return next;
}

export async function clearStudioHistory(kind: StudioHistoryKind, reportId: string): Promise<void> {
  await AsyncStorage.removeItem(historyKey(kind, reportId));
}

export async function loadSavedVisuals(reportId: string): Promise<SavedVisual[]> {
  try {
    const raw = await AsyncStorage.getItem(savedVisualsKey(reportId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedVisual[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => Boolean(item?.id && item?.imageUrl && item?.kind));
  } catch {
    return [];
  }
}

export async function saveVisualForReport(reportId: string, visual: SavedVisual): Promise<SavedVisual[]> {
  const current = await loadSavedVisuals(reportId);
  const next = [visual, ...current.filter((item) => item.id !== visual.id)].slice(0, SAVED_VISUALS_LIMIT);
  await AsyncStorage.setItem(savedVisualsKey(reportId), JSON.stringify(next));
  return next;
}

export async function removeSavedVisual(reportId: string, visualId: string): Promise<SavedVisual[]> {
  const current = await loadSavedVisuals(reportId);
  const next = current.filter((item) => item.id !== visualId);
  await AsyncStorage.setItem(savedVisualsKey(reportId), JSON.stringify(next));
  return next;
}
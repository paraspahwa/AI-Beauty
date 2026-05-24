import AsyncStorage from "@react-native-async-storage/async-storage";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { fetchReport, fetchStudioVault, removeStudioVaultAsset, type MobileVaultAsset } from "@/lib/api";

type VaultFilter = "all" | "canvas" | "report";
type VaultSort = "newest" | "oldest" | "tool";

type VaultGroup = {
  label: string;
  items: MobileVaultAsset[];
};

type VaultSection = {
  title: string;
  allItems: MobileVaultAsset[];
  data: { key: string; items: MobileVaultAsset[] }[];
};

type VaultAssetCardProps = {
  asset: MobileVaultAsset;
  bulkMode: boolean;
  bulkDeleting: boolean;
  isSelected: boolean;
  onToggleSelection: (asset: MobileVaultAsset) => void;
  onPreview: (asset: MobileVaultAsset) => void;
  onOpenActions: (asset: MobileVaultAsset) => void;
};

const STUDIO_VAULT_PREFS_KEY = "studio_vault:preferences";
const BULK_DELETE_MAX_ATTEMPTS = 3;
const ENABLE_VAULT_PERF_LOGS = typeof __DEV__ !== "undefined" ? __DEV__ : false;

type PerfEntry = {
  id: string;
  label: string;
  elapsedMs: number;
  meta?: string;
};

type PerfLevel = "fast" | "medium" | "slow";

type PerfThreshold = {
  fastMs: number;
  mediumMs: number;
};

type PerfThresholdMap = Record<string, PerfThreshold>;
type PerfPreset = "strict" | "balanced" | "relaxed";
const PERF_OPERATIONS = ["load", "load_more", "refresh", "bulk_delete"] as const;
type PerfOperation = (typeof PERF_OPERATIONS)[number];
type PerfFilter = "all" | PerfOperation;
type PerfBaseline = {
  avg: number;
  p95: number;
  count: number;
};

const PERF_THRESHOLDS_DEFAULT: PerfThresholdMap = {
  load: { fastMs: 500, mediumMs: 1200 },
  load_more: { fastMs: 350, mediumMs: 900 },
  refresh: { fastMs: 600, mediumMs: 1400 },
  bulk_delete: { fastMs: 1200, mediumMs: 2600 },
};
const PERF_PRESET_FACTORS: Record<PerfPreset, number> = {
  strict: 0.8,
  balanced: 1,
  relaxed: 1.25,
};
const PERF_THRESHOLDS_KEY = "studio_vault:perf_thresholds";
const PERF_PANEL_PREFS_KEY = "studio_vault:perf_panel_prefs";
const PERF_BASELINES_KEY = "studio_vault:perf_baselines";

function perfStart(_label: string): number | null {
  if (!ENABLE_VAULT_PERF_LOGS) return null;
  return Date.now();
}

function perfEnd(label: string, startedAt: number | null, meta?: string): number | null {
  if (!ENABLE_VAULT_PERF_LOGS || startedAt === null) return null;
  const elapsedMs = Date.now() - startedAt;
  const suffix = meta ? ` ${meta}` : "";
  console.log(`[vault-perf] ${label} ${elapsedMs}ms${suffix}`);
  return elapsedMs;
}

function getPerfLevel(label: string, elapsedMs: number, thresholds: PerfThresholdMap): PerfLevel {
  const threshold = thresholds[label] ?? { fastMs: 300, mediumMs: 900 };
  if (elapsedMs < threshold.fastMs) return "fast";
  if (elapsedMs < threshold.mediumMs) return "medium";
  return "slow";
}

function clampThresholdValue(value: number): number {
  return Math.max(50, Math.min(10000, value));
}

async function waitMs(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function deleteWithRetry(assetId: string, attempts = BULK_DELETE_MAX_ATTEMPTS): Promise<boolean> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await removeStudioVaultAsset(assetId);
      return true;
    } catch {
      if (attempt >= attempts) return false;
      await waitMs(150 * 2 ** (attempt - 1));
    }
  }

  return false;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function dayGroupLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Earlier";

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);

  if (parsed >= startToday) return "Today";
  if (parsed >= startYesterday) return "Yesterday";
  return "Earlier";
}

const VaultAssetCard = memo(function VaultAssetCard({
  asset,
  bulkMode,
  bulkDeleting,
  isSelected,
  onToggleSelection,
  onPreview,
  onOpenActions,
}: VaultAssetCardProps) {
  return (
    <View style={styles.assetCard}>
      <Pressable onPress={() => (bulkDeleting ? undefined : bulkMode ? onToggleSelection(asset) : onPreview(asset))}>
        <Image source={{ uri: asset.lowResUrl || asset.hdUrl }} style={styles.assetImage} />
      </Pressable>
      <Text style={styles.assetMeta} numberOfLines={1}>{asset.tool}{asset.variant ? ` • ${asset.variant}` : ""}</Text>
      <Text style={styles.assetDate}>{formatDate(asset.createdAt)}</Text>
      {bulkMode ? (
        <Pressable
          onPress={() => {
            if (!bulkDeleting) onToggleSelection(asset);
          }}
          style={[
            styles.selectionButton,
            isSelected ? styles.selectionButtonActive : null,
            bulkDeleting ? styles.bulkActionDisabled : null,
          ]}
        >
          <Text style={[styles.selectionButtonLabel, isSelected ? styles.selectionButtonLabelActive : null]}>
            {isSelected ? "Selected" : "Select"}
          </Text>
        </Pressable>
      ) : (
        <Pressable onPress={() => { if (!bulkDeleting) onOpenActions(asset); }} style={styles.sourceButton}>
          <Text style={styles.sourceButtonLabel}>Actions</Text>
        </Pressable>
      )}
    </View>
  );
});

export default function StudioVaultTabScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<VaultFilter>("all");
  const [sort, setSort] = useState<VaultSort>("newest");
  const [query, setQuery] = useState("");
  const [assets, setAssets] = useState<MobileVaultAsset[]>([]);
  const [previewAsset, setPreviewAsset] = useState<MobileVaultAsset | null>(null);
  const [actionAsset, setActionAsset] = useState<MobileVaultAsset | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; success: number } | null>(null);
  const [failedDeleteIds, setFailedDeleteIds] = useState<string[]>([]);
  const [retrySummary, setRetrySummary] = useState<{ attempted: number; recovered: number } | null>(null);
  const [showPerfPanel, setShowPerfPanel] = useState(false);
  const [perfEntries, setPerfEntries] = useState<PerfEntry[]>([]);
  const [perfFilter, setPerfFilter] = useState<PerfFilter>("all");
  const [perfRecordingEnabled, setPerfRecordingEnabled] = useState(true);
  const [perfSlowOnly, setPerfSlowOnly] = useState(false);
  const [perfThresholds, setPerfThresholds] = useState<PerfThresholdMap>(PERF_THRESHOLDS_DEFAULT);
  const [perfBaselines, setPerfBaselines] = useState<Record<string, PerfBaseline>>({});
  const [total, setTotal] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  const PAGE_SIZE = 24;

  const recordPerf = useCallback((label: string, startedAt: number | null, meta?: string) => {
    if (!perfRecordingEnabled) return;
    const elapsedMs = perfEnd(label, startedAt, meta);
    if (!ENABLE_VAULT_PERF_LOGS || elapsedMs === null) return;

    setPerfEntries((prev) => {
      const next: PerfEntry[] = [
        {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          label,
          elapsedMs,
          meta,
        },
        ...prev,
      ];
      return next.slice(0, 8);
    });
  }, [perfRecordingEnabled]);

  const filteredPerfEntries = useMemo(() => {
    const byOp = perfFilter === "all" ? perfEntries : perfEntries.filter((entry) => entry.label === perfFilter);
    if (!perfSlowOnly) return byOp;
    return byOp.filter((entry) => getPerfLevel(entry.label, entry.elapsedMs, perfThresholds) === "slow");
  }, [perfEntries, perfFilter, perfSlowOnly, perfThresholds]);

  const perfStats = useMemo(() => {
    if (filteredPerfEntries.length === 0) return null;
    const values = filteredPerfEntries.map((entry) => entry.elapsedMs);
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((acc, value) => acc + value, 0);
    const avg = Math.round(sum / values.length);
    const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
    const p95 = sorted[p95Index];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    return { count: values.length, avg, p95, min, max };
  }, [filteredPerfEntries]);

  const perfBaselineKey = useMemo(() => `${perfFilter}:${perfSlowOnly ? "slow" : "all"}`, [perfFilter, perfSlowOnly]);
  const activeBaseline = perfBaselines[perfBaselineKey] ?? null;
  const perfBaselineDelta = useMemo(() => {
    if (!perfStats || !activeBaseline || activeBaseline.avg <= 0 || activeBaseline.p95 <= 0) return null;
    const avgDeltaPct = ((perfStats.avg - activeBaseline.avg) / activeBaseline.avg) * 100;
    const p95DeltaPct = ((perfStats.p95 - activeBaseline.p95) / activeBaseline.p95) * 100;
    return {
      avgDeltaPct,
      p95DeltaPct,
    };
  }, [perfStats, activeBaseline]);

  const perfWorstOp = useMemo(() => {
    if (filteredPerfEntries.length === 0) return null;
    const bucket = new Map<string, { total: number; count: number; max: number }>();
    for (const entry of filteredPerfEntries) {
      const current = bucket.get(entry.label);
      if (!current) {
        bucket.set(entry.label, { total: entry.elapsedMs, count: 1, max: entry.elapsedMs });
      } else {
        current.total += entry.elapsedMs;
        current.count += 1;
        current.max = Math.max(current.max, entry.elapsedMs);
      }
    }

    let winner: { label: string; avg: number; max: number } | null = null;
    for (const [label, value] of bucket.entries()) {
      const avg = Math.round(value.total / value.count);
      if (!winner || avg > winner.avg) {
        winner = { label, avg, max: value.max };
      }
    }

    return winner;
  }, [filteredPerfEntries]);

  const perfRegression = useMemo(() => {
    const byOp = new Map<string, number[]>();
    for (const entry of filteredPerfEntries) {
      const list = byOp.get(entry.label);
      if (list) {
        list.push(entry.elapsedMs);
      } else {
        byOp.set(entry.label, [entry.elapsedMs]);
      }
    }

    let worst: { label: string; deltaPct: number; recentAvg: number; previousAvg: number } | null = null;

    for (const [label, series] of byOp.entries()) {
      if (series.length < 6) continue;
      const recent = series.slice(0, 3);
      const previous = series.slice(3, 6);
      const recentAvg = recent.reduce((acc, value) => acc + value, 0) / recent.length;
      const previousAvg = previous.reduce((acc, value) => acc + value, 0) / previous.length;
      if (previousAvg <= 0) continue;

      const deltaPct = ((recentAvg - previousAvg) / previousAvg) * 100;
      if (!worst || deltaPct > worst.deltaPct) {
        worst = {
          label,
          deltaPct,
          recentAvg: Math.round(recentAvg),
          previousAvg: Math.round(previousAvg),
        };
      }
    }

    if (!worst || worst.deltaPct <= 0) return null;
    return worst;
  }, [filteredPerfEntries]);

  async function load(nextFilter: VaultFilter = filter) {
    const perf = perfStart("load");
    let fetched = 0;
    let fetchedTotal = 0;
    let ok = false;
    try {
      setError(null);
      const response = await fetchStudioVault({ filter: nextFilter, limit: PAGE_SIZE, offset: 0 });
      setAssets(response.assets ?? []);
      setTotal(response.total ?? 0);
      fetched = response.assets?.length ?? 0;
      fetchedTotal = response.total ?? 0;
      ok = true;
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
      recordPerf("load", perf, `ok=${ok} filter=${nextFilter} fetched=${fetched} total=${fetchedTotal}`);
    }
  }

  async function loadMore() {
    const perf = perfStart("load_more");
    const startOffset = assets.length;
    let fetched = 0;
    let ok = false;
    try {
      if (loadingMore || assets.length >= total) return;
      setLoadingMore(true);
      const response = await fetchStudioVault({
        filter,
        limit: PAGE_SIZE,
        offset: assets.length,
      });
      setAssets((prev) => [...prev, ...(response.assets ?? [])]);
      if (typeof response.total === "number") {
        setTotal(response.total);
      }
      fetched = response.assets?.length ?? 0;
      ok = true;
    } catch (err) {
      setError(String(err));
    } finally {
      setLoadingMore(false);
      recordPerf("load_more", perf, `ok=${ok} filter=${filter} offset=${startOffset} fetched=${fetched}`);
    }
  }

  useEffect(() => {
    let active = true;

    async function hydratePreferences() {
      try {
        const raw = await AsyncStorage.getItem(STUDIO_VAULT_PREFS_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw) as {
          filter?: VaultFilter;
          sort?: VaultSort;
          query?: string;
        };

        if (!active) return;

        if (parsed.filter === "all" || parsed.filter === "report" || parsed.filter === "canvas") {
          setFilter(parsed.filter);
        }
        if (parsed.sort === "newest" || parsed.sort === "oldest" || parsed.sort === "tool") {
          setSort(parsed.sort);
        }
        if (typeof parsed.query === "string") {
          setQuery(parsed.query);
        }
      } catch {
        // Ignore invalid local preference payloads
      } finally {
        if (active) {
          setHydrated(true);
        }
      }
    }

    void hydratePreferences();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload = JSON.stringify({ filter, sort, query });
    void AsyncStorage.setItem(STUDIO_VAULT_PREFS_KEY, payload);
  }, [filter, sort, query, hydrated]);

  useEffect(() => {
    if (!ENABLE_VAULT_PERF_LOGS) return;
    let active = true;

    async function hydratePerfThresholds() {
      try {
        const raw = await AsyncStorage.getItem(PERF_THRESHOLDS_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<PerfThresholdMap>;
        if (!active || typeof parsed !== "object" || !parsed) return;

        setPerfThresholds((prev) => {
          const next: PerfThresholdMap = { ...prev };
          for (const key of Object.keys(PERF_THRESHOLDS_DEFAULT)) {
            const candidate = parsed[key];
            if (!candidate) continue;
            const fastMs = clampThresholdValue(Number(candidate.fastMs));
            const mediumMs = clampThresholdValue(Number(candidate.mediumMs));
            next[key] = {
              fastMs,
              mediumMs: Math.max(fastMs + 50, mediumMs),
            };
          }
          return next;
        });
      } catch {
        // Ignore invalid stored thresholds in dev mode.
      }
    }

    void hydratePerfThresholds();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ENABLE_VAULT_PERF_LOGS) return;
    void AsyncStorage.setItem(PERF_THRESHOLDS_KEY, JSON.stringify(perfThresholds));
  }, [perfThresholds]);

  useEffect(() => {
    if (!ENABLE_VAULT_PERF_LOGS) return;
    let active = true;

    async function hydratePerfPanelPrefs() {
      try {
        const raw = await AsyncStorage.getItem(PERF_PANEL_PREFS_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as { show?: boolean; filter?: PerfFilter; recording?: boolean; slowOnly?: boolean };
        if (!active || typeof parsed !== "object" || !parsed) return;

        if (typeof parsed.show === "boolean") {
          setShowPerfPanel(parsed.show);
        }
        const validFilters: PerfFilter[] = ["all", ...PERF_OPERATIONS];
        if (parsed.filter && validFilters.includes(parsed.filter)) {
          setPerfFilter(parsed.filter);
        }
        if (typeof parsed.recording === "boolean") {
          setPerfRecordingEnabled(parsed.recording);
        }
        if (typeof parsed.slowOnly === "boolean") {
          setPerfSlowOnly(parsed.slowOnly);
        }
      } catch {
        // Ignore invalid panel pref payloads in dev mode.
      }
    }

    void hydratePerfPanelPrefs();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ENABLE_VAULT_PERF_LOGS) return;
    void AsyncStorage.setItem(
      PERF_PANEL_PREFS_KEY,
      JSON.stringify({
        show: showPerfPanel,
        filter: perfFilter,
        recording: perfRecordingEnabled,
        slowOnly: perfSlowOnly,
      }),
    );
  }, [showPerfPanel, perfFilter, perfRecordingEnabled, perfSlowOnly]);

  useEffect(() => {
    if (!ENABLE_VAULT_PERF_LOGS) return;
    let active = true;

    async function hydratePerfBaselines() {
      try {
        const raw = await AsyncStorage.getItem(PERF_BASELINES_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Record<string, PerfBaseline>;
        if (!active || typeof parsed !== "object" || !parsed) return;
        setPerfBaselines(parsed);
      } catch {
        // Ignore invalid baseline payloads in dev mode.
      }
    }

    void hydratePerfBaselines();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ENABLE_VAULT_PERF_LOGS) return;
    void AsyncStorage.setItem(PERF_BASELINES_KEY, JSON.stringify(perfBaselines));
  }, [perfBaselines]);

  useFocusEffect(
    useCallback(() => {
      if (!hydrated) return;
      setLoading(true);
      void load(filter);
    }, [filter, hydrated]),
  );

  function applyFilter(next: VaultFilter) {
    setFilter(next);
    setLoading(true);
  }

  function applySort(next: VaultSort) {
    setSort(next);
  }

  async function onRefresh() {
    const perf = perfStart("refresh");
    try {
      setRefreshing(true);
      await load(filter);
    } finally {
      setRefreshing(false);
      recordPerf("refresh", perf, `filter=${filter}`);
    }
  }

  const visibleAssets = useMemo(() => {
    const search = query.trim().toLowerCase();
    const filtered = assets.filter((asset) => {
      const text = `${asset.tool} ${asset.variant ?? ""}`.toLowerCase();
      return text.includes(search);
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sort === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      if (sort === "tool") {
        const toolCmp = a.tool.localeCompare(b.tool);
        if (toolCmp !== 0) return toolCmp;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sorted;
  }, [assets, query, sort]);

  const groupedAssets = useMemo<VaultGroup[]>(() => {
    const map = new Map<string, MobileVaultAsset[]>();
    for (const asset of visibleAssets) {
      const label = dayGroupLabel(asset.createdAt);
      const existing = map.get(label);
      if (existing) {
        existing.push(asset);
      } else {
        map.set(label, [asset]);
      }
    }

    const order = ["Today", "Yesterday", "Earlier"];
    return order
      .filter((label) => map.has(label))
      .map((label) => ({ label, items: map.get(label) ?? [] }));
  }, [visibleAssets]);

  const visibleIds = useMemo(() => visibleAssets.map((asset) => asset.id), [visibleAssets]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedVisibleCount = useMemo(
    () => visibleIds.filter((id) => selectedIdSet.has(id)).length,
    [visibleIds, selectedIdSet],
  );

  const sections = useMemo<VaultSection[]>(() => {
    return groupedAssets.map((group) => {
      const rows: { key: string; items: MobileVaultAsset[] }[] = [];
      for (let i = 0; i < group.items.length; i += 2) {
        const items = group.items.slice(i, i + 2);
        rows.push({
          key: `${group.label}_${i}_${items.map((asset) => asset.id).join("_")}`,
          items,
        });
      }
      return {
        title: group.label,
        allItems: group.items,
        data: rows,
      };
    });
  }, [groupedAssets]);

  useEffect(() => {
    const allowed = new Set(visibleAssets.map((asset) => asset.id));
    setSelectedIds((prev) => prev.filter((id) => allowed.has(id)));
    setFailedDeleteIds((prev) => prev.filter((id) => allowed.has(id)));
  }, [visibleAssets]);

  function isSelected(id: string): boolean {
    return selectedIdSet.has(id);
  }

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);

  const handleToggleSelectionAsset = useCallback((asset: MobileVaultAsset) => {
    if (!bulkDeleting) {
      toggleSelection(asset.id);
    }
  }, [bulkDeleting, toggleSelection]);

  const handlePreviewAsset = useCallback((asset: MobileVaultAsset) => {
    setPreviewAsset(asset);
  }, []);

  const handleOpenActionsAsset = useCallback((asset: MobileVaultAsset) => {
    if (!bulkDeleting) {
      setActionAsset(asset);
    }
  }, [bulkDeleting]);

  function toggleGroupSelection(items: MobileVaultAsset[]) {
    const ids = items.map((item) => item.id);
    const allSelected = ids.every((id) => selectedIdSet.has(id));
    setSelectedIds((prev) => {
      if (allSelected) {
        return prev.filter((id) => !ids.includes(id));
      }
      const merged = new Set([...prev, ...ids]);
      return Array.from(merged);
    });
  }

  function toggleBulkMode() {
    if (bulkDeleting) return;
    setBulkMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedIds([]);
        setBulkProgress(null);
        setFailedDeleteIds([]);
        setRetrySummary(null);
      }
      return next;
    });
  }

  function selectAllVisible() {
    const merged = new Set([...selectedIds, ...visibleIds]);
    setSelectedIds(Array.from(merged));
  }

  function clearVisibleSelection() {
    const visibleSet = new Set(visibleIds);
    setSelectedIds((prev) => prev.filter((id) => !visibleSet.has(id)));
  }

  const adjustPerfThreshold = useCallback((label: string, field: keyof PerfThreshold, delta: number) => {
    setPerfThresholds((prev) => {
      const current = prev[label] ?? PERF_THRESHOLDS_DEFAULT[label] ?? { fastMs: 300, mediumMs: 900 };
      const nextFieldValue = clampThresholdValue(current[field] + delta);
      const next: PerfThreshold =
        field === "fastMs"
          ? {
              fastMs: nextFieldValue,
              mediumMs: Math.max(nextFieldValue + 50, current.mediumMs),
            }
          : {
              fastMs: Math.min(current.fastMs, Math.max(50, nextFieldValue - 50)),
              mediumMs: nextFieldValue,
            };

      return {
        ...prev,
        [label]: {
          fastMs: clampThresholdValue(next.fastMs),
          mediumMs: clampThresholdValue(Math.max(next.fastMs + 50, next.mediumMs)),
        },
      };
    });
  }, []);

  const resetPerfThresholds = useCallback(() => {
    setPerfThresholds(PERF_THRESHOLDS_DEFAULT);
  }, []);

  const applyPerfPreset = useCallback((preset: PerfPreset) => {
    const factor = PERF_PRESET_FACTORS[preset];
    const next: PerfThresholdMap = {};
    for (const key of Object.keys(PERF_THRESHOLDS_DEFAULT)) {
      const base = PERF_THRESHOLDS_DEFAULT[key];
      const fastMs = clampThresholdValue(Math.round(base.fastMs * factor));
      const mediumMs = clampThresholdValue(Math.round(base.mediumMs * factor));
      next[key] = {
        fastMs,
        mediumMs: Math.max(fastMs + 50, mediumMs),
      };
    }
    setPerfThresholds(next);
  }, []);

  const savePerfBaseline = useCallback(() => {
    if (!perfStats) return;
    setPerfBaselines((prev) => ({
      ...prev,
      [perfBaselineKey]: {
        avg: perfStats.avg,
        p95: perfStats.p95,
        count: perfStats.count,
      },
    }));
  }, [perfBaselineKey, perfStats]);

  const clearPerfBaseline = useCallback(() => {
    setPerfBaselines((prev) => {
      const next = { ...prev };
      delete next[perfBaselineKey];
      return next;
    });
  }, [perfBaselineKey]);

  function retryFailedDeletes() {
    if (failedDeleteIds.length === 0 || bulkDeleting) return;
    setSelectedIds(failedDeleteIds);
    setFailedDeleteIds([]);
    handleBulkDelete(failedDeleteIds, "retry");
  }

  function openSource(asset: MobileVaultAsset) {
    if (asset.sourceType === "report" && asset.sourceId) {
      router.push({ pathname: "/report/[id]", params: { id: asset.sourceId } });
    }
  }

  async function openStudioAction(asset: MobileVaultAsset, mode: "makeup" | "hair") {
    if (asset.sourceType !== "report" || !asset.sourceId) return;
    try {
      const report = await fetchReport(asset.sourceId);
      const pathname = mode === "makeup" ? "/studio/makeup/[id]" : "/studio/hair/[id]";
      router.push({ pathname, params: { id: asset.sourceId, imageUrl: report.imageUrl } });
    } catch {
      // Fallback to report if image lookup fails
      router.push({ pathname: "/report/[id]", params: { id: asset.sourceId } });
    }
  }

  function handleRemoveAsset(asset: MobileVaultAsset) {
    Alert.alert("Remove from vault?", "This will permanently remove this generated asset.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              setRemovingId(asset.id);
              await removeStudioVaultAsset(asset.id);
              setAssets((prev) => prev.filter((item) => item.id !== asset.id));
              setSelectedIds((prev) => prev.filter((id) => id !== asset.id));
              setTotal((prev) => Math.max(0, prev - 1));
              if (previewAsset?.id === asset.id) {
                setPreviewAsset(null);
              }
            } catch (err) {
              setError(String(err));
            } finally {
              setRemovingId(null);
            }
          })();
        },
      },
    ]);
  }

  function handleBulkDelete(overrideIds?: string[], source: "selection" | "retry" = "selection") {
    const targetIds = overrideIds ?? selectedIds;
    if (targetIds.length === 0 || bulkDeleting) return;

    Alert.alert("Delete selected assets?", `This will permanently remove ${targetIds.length} generated assets.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            const perf = perfStart("bulk_delete");
            const deletingIds = [...targetIds];
            let succeededCount = 0;
            let failedCount = 0;
            try {
              setBulkDeleting(true);
              setBulkProgress({ done: 0, total: deletingIds.length, success: 0 });
              const removedIds: string[] = [];
              const failedIds: string[] = [];

              for (let index = 0; index < deletingIds.length; index += 1) {
                const id = deletingIds[index];
                const success = await deleteWithRetry(id);
                if (success) {
                  removedIds.push(id);
                  setBulkProgress({ done: index + 1, total: deletingIds.length, success: removedIds.length });
                } else {
                  failedIds.push(id);
                  setBulkProgress({ done: index + 1, total: deletingIds.length, success: removedIds.length });
                }
              }

              if (removedIds.length > 0) {
                const removedSet = new Set(removedIds);
                setAssets((prev) => prev.filter((item) => !removedSet.has(item.id)));
                setSelectedIds((prev) => prev.filter((id) => !removedSet.has(id)));
                setTotal((prev) => Math.max(0, prev - removedIds.length));
                if (previewAsset && removedSet.has(previewAsset.id)) {
                  setPreviewAsset(null);
                }
                if (actionAsset && removedSet.has(actionAsset.id)) {
                  setActionAsset(null);
                }
              }

              if (removedIds.length !== deletingIds.length) {
                setFailedDeleteIds(failedIds);
                setError("Some selected assets could not be deleted. Please retry.");
              } else {
                setFailedDeleteIds([]);
              }

              succeededCount = removedIds.length;
              failedCount = failedIds.length;

              setRetrySummary({
                attempted: deletingIds.length,
                recovered: deletingIds.length - failedIds.length,
              });
            } finally {
              setBulkDeleting(false);
              recordPerf(
                "bulk_delete",
                perf,
                `source=${source} attempted=${deletingIds.length} success=${succeededCount} failed=${failedCount}`,
              );
            }
          })();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#111827" />
      </SafeAreaView>
    );
  }

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.title}>Studio Vault</Text>
      <Text style={styles.subtitle}>Browse generated looks across report and canvas contexts.</Text>

      {ENABLE_VAULT_PERF_LOGS ? (
        <View style={styles.perfPanelWrap}>
          <View style={styles.perfToolbar}>
            <Pressable onPress={() => setShowPerfPanel((prev) => !prev)} style={styles.perfToggleButton}>
              <Text style={styles.perfToggleLabel}>{showPerfPanel ? "Hide perf" : "Show perf"}</Text>
            </Pressable>
            {showPerfPanel ? (
              <Pressable onPress={() => setPerfRecordingEnabled((prev) => !prev)} style={styles.perfRecordToggleButton}>
                <Text style={styles.perfRecordToggleLabel}>{perfRecordingEnabled ? "Pause" : "Resume"}</Text>
              </Pressable>
            ) : null}
            {showPerfPanel ? (
              <Pressable
                onPress={() => setPerfSlowOnly((prev) => !prev)}
                style={[styles.perfSlowToggleButton, perfSlowOnly ? styles.perfSlowToggleButtonActive : null]}
              >
                <Text style={[styles.perfSlowToggleLabel, perfSlowOnly ? styles.perfSlowToggleLabelActive : null]}>
                  Slow only
                </Text>
              </Pressable>
            ) : null}
            {showPerfPanel ? (
              <Pressable onPress={() => setPerfEntries([])} style={styles.perfClearButton}>
                <Text style={styles.perfClearLabel}>Clear</Text>
              </Pressable>
            ) : null}
          </View>
          {showPerfPanel ? (
            <View style={styles.perfPanel}>
              <View style={styles.perfThresholdHeaderRow}>
                <Text style={styles.perfThresholdHeaderLabel}>Thresholds (ms)</Text>
                <Pressable onPress={resetPerfThresholds} style={styles.perfThresholdResetButton}>
                  <Text style={styles.perfThresholdResetLabel}>Reset</Text>
                </Pressable>
              </View>
              <View style={styles.perfPresetRow}>
                {(["strict", "balanced", "relaxed"] as PerfPreset[]).map((preset) => (
                  <Pressable key={preset} onPress={() => applyPerfPreset(preset)} style={styles.perfPresetButton}>
                    <Text style={styles.perfPresetLabel}>{preset}</Text>
                  </Pressable>
                ))}
              </View>
              {Object.keys(PERF_THRESHOLDS_DEFAULT).map((key) => {
                const threshold = perfThresholds[key] ?? PERF_THRESHOLDS_DEFAULT[key];
                return (
                  <View key={key} style={styles.perfThresholdRow}>
                    <Text style={styles.perfThresholdOpLabel}>{key}</Text>
                    <View style={styles.perfThresholdControls}>
                      <Pressable onPress={() => adjustPerfThreshold(key, "fastMs", -50)} style={styles.perfThresholdButton}>
                        <Text style={styles.perfThresholdButtonLabel}>-</Text>
                      </Pressable>
                      <Text style={styles.perfThresholdValueLabel}>F {threshold.fastMs}</Text>
                      <Pressable onPress={() => adjustPerfThreshold(key, "fastMs", 50)} style={styles.perfThresholdButton}>
                        <Text style={styles.perfThresholdButtonLabel}>+</Text>
                      </Pressable>
                    </View>
                    <View style={styles.perfThresholdControls}>
                      <Pressable onPress={() => adjustPerfThreshold(key, "mediumMs", -50)} style={styles.perfThresholdButton}>
                        <Text style={styles.perfThresholdButtonLabel}>-</Text>
                      </Pressable>
                      <Text style={styles.perfThresholdValueLabel}>M {threshold.mediumMs}</Text>
                      <Pressable onPress={() => adjustPerfThreshold(key, "mediumMs", 50)} style={styles.perfThresholdButton}>
                        <Text style={styles.perfThresholdButtonLabel}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}

              <View style={styles.perfDivider} />

              <View style={styles.perfFilterRow}>
                {(["all", ...PERF_OPERATIONS] as PerfFilter[]).map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setPerfFilter(option)}
                    style={[styles.perfFilterChip, perfFilter === option ? styles.perfFilterChipActive : null]}
                  >
                    <Text style={[styles.perfFilterChipLabel, perfFilter === option ? styles.perfFilterChipLabelActive : null]}>
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {perfStats ? (
                <View style={styles.perfStatsCard}>
                  <View style={styles.perfBaselineToolbar}>
                    <Pressable onPress={savePerfBaseline} style={styles.perfBaselineButton}>
                      <Text style={styles.perfBaselineButtonLabel}>Save baseline</Text>
                    </Pressable>
                    {activeBaseline ? (
                      <Pressable onPress={clearPerfBaseline} style={styles.perfBaselineClearButton}>
                        <Text style={styles.perfBaselineClearLabel}>Clear baseline</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <Text style={styles.perfStatsLabel}>count {perfStats.count}</Text>
                  <Text style={styles.perfStatsLabel}>avg {perfStats.avg}ms</Text>
                  <Text style={styles.perfStatsLabel}>p95 {perfStats.p95}ms</Text>
                  <Text style={styles.perfStatsLabel}>min {perfStats.min}ms</Text>
                  <Text style={styles.perfStatsLabel}>max {perfStats.max}ms</Text>
                  {activeBaseline ? (
                    <Text style={styles.perfBaselineLabel}>baseline avg {activeBaseline.avg}ms p95 {activeBaseline.p95}ms</Text>
                  ) : null}
                  {perfBaselineDelta ? (
                    <Text style={styles.perfBaselineDeltaLabel}>
                      delta avg {perfBaselineDelta.avgDeltaPct >= 0 ? "+" : ""}{perfBaselineDelta.avgDeltaPct.toFixed(0)}% | p95 {perfBaselineDelta.p95DeltaPct >= 0 ? "+" : ""}{perfBaselineDelta.p95DeltaPct.toFixed(0)}%
                    </Text>
                  ) : null}
                  {perfWorstOp ? (
                    <Text style={styles.perfWorstLabel}>
                      worst {perfWorstOp.label} (avg {perfWorstOp.avg}ms, max {perfWorstOp.max}ms)
                    </Text>
                  ) : null}
                  {perfRegression ? (
                    <Text style={styles.perfRegressionLabel}>
                      regression {perfRegression.label}: +{perfRegression.deltaPct.toFixed(0)}% (recent {perfRegression.recentAvg}ms vs prev {perfRegression.previousAvg}ms)
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {filteredPerfEntries.length === 0 ? (
                <Text style={styles.perfEntryMeta}>No perf entries yet.</Text>
              ) : (
                filteredPerfEntries.map((entry) => {
                  const level = getPerfLevel(entry.label, entry.elapsedMs, perfThresholds);
                  return (
                    <View key={entry.id} style={styles.perfEntryRow}>
                      <View style={styles.perfEntryTitleRow}>
                        <Text style={styles.perfEntryLabel}>{entry.label}: {entry.elapsedMs}ms</Text>
                        <View
                          style={[
                            styles.perfBadge,
                            level === "fast"
                              ? styles.perfBadgeFast
                              : level === "medium"
                                ? styles.perfBadgeMedium
                                : styles.perfBadgeSlow,
                          ]}
                        >
                          <Text style={styles.perfBadgeLabel}>{level}</Text>
                        </View>
                      </View>
                      {entry.meta ? <Text style={styles.perfEntryMeta}>{entry.meta}</Text> : null}
                    </View>
                  );
                })
              )}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.bulkBar}>
        <Text style={styles.bulkLabel}>
          {bulkMode
            ? bulkDeleting && bulkProgress
              ? `Deleting ${bulkProgress.done}/${bulkProgress.total}`
              : `${selectedIds.length} selected`
            : "Bulk actions"}
        </Text>
        <View style={styles.bulkActions}>
          {bulkMode ? (
            <>
              <Pressable
                onPress={selectedVisibleCount === visibleIds.length && visibleIds.length > 0 ? clearVisibleSelection : selectAllVisible}
                disabled={visibleIds.length === 0 || bulkDeleting}
                style={[styles.bulkSelectVisibleButton, visibleIds.length === 0 || bulkDeleting ? styles.bulkActionDisabled : null]}
              >
                <Text style={styles.bulkSelectVisibleButtonLabel}>
                  {selectedVisibleCount === visibleIds.length && visibleIds.length > 0 ? "Clear visible" : "Select visible"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleBulkDelete(undefined, "selection")}
                disabled={selectedIds.length === 0 || bulkDeleting}
                style={[styles.bulkDeleteButton, selectedIds.length === 0 || bulkDeleting ? styles.bulkActionDisabled : null]}
              >
                <Text style={styles.bulkDeleteButtonLabel}>{bulkDeleting ? "Deleting..." : "Delete selected"}</Text>
              </Pressable>
            </>
          ) : null}
          <Pressable onPress={toggleBulkMode} disabled={bulkDeleting} style={[styles.bulkModeButton, bulkDeleting ? styles.bulkActionDisabled : null]}>
            <Text style={styles.bulkModeButtonLabel}>{bulkMode ? "Done" : "Select"}</Text>
          </Pressable>
        </View>
      </View>

      {bulkMode && bulkProgress && !bulkDeleting ? (
        <View style={styles.bulkProgressCard}>
          <Text style={styles.bulkProgressText}>
            Deleted {bulkProgress.success}/{bulkProgress.total} selected assets
          </Text>
          {retrySummary ? (
            <Text style={styles.bulkProgressMeta}>
              Retry policy: up to {BULK_DELETE_MAX_ATTEMPTS} attempts per asset ({retrySummary.recovered}/{retrySummary.attempted} succeeded)
            </Text>
          ) : null}
        </View>
      ) : null}

      {bulkMode && failedDeleteIds.length > 0 && !bulkDeleting ? (
        <View style={styles.bulkRetryCard}>
          <Text style={styles.bulkRetryText}>{failedDeleteIds.length} failed deletions</Text>
          <Pressable onPress={retryFailedDeletes} style={styles.bulkRetryButton}>
            <Text style={styles.bulkRetryButtonLabel}>Retry failed</Text>
          </Pressable>
        </View>
      ) : null}

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by tool or variant"
        placeholderTextColor="#9ca3af"
        style={styles.searchInput}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.filterRow}>
        {(["all", "report", "canvas"] as VaultFilter[]).map((option) => (
          <Pressable
            key={option}
            onPress={() => applyFilter(option)}
            style={[styles.filterChip, filter === option ? styles.filterChipActive : null]}
          >
            <Text style={[styles.filterChipLabel, filter === option ? styles.filterChipLabelActive : null]}>{option}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sortRow}>
        {(["newest", "oldest", "tool"] as VaultSort[]).map((option) => (
          <Pressable
            key={option}
            onPress={() => applySort(option)}
            style={[styles.sortChip, sort === option ? styles.sortChipActive : null]}
          >
            <Text style={[styles.sortChipLabel, sort === option ? styles.sortChipLabelActive : null]}>{option}</Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Vault unavailable</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Pressable onPress={() => { setLoading(true); void load(filter); }} style={styles.retryButton}>
            <Text style={styles.retryButtonLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {!error && assets.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No generated assets yet</Text>
          <Text style={styles.emptyBody}>Create looks from report Studio actions to populate your vault.</Text>
        </View>
      ) : null}

      {!error && assets.length > 0 && visibleAssets.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No results for this search</Text>
          <Text style={styles.emptyBody}>Try a different keyword or clear the search box.</Text>
        </View>
      ) : null}
    </View>
  );

  const renderFooter = () => (
    assets.length > 0 && assets.length < total ? (
      <Pressable onPress={() => void loadMore()} disabled={loadingMore || bulkDeleting} style={[styles.loadMoreButton, loadingMore || bulkDeleting ? styles.loadMoreDisabled : null]}>
        <Text style={styles.loadMoreButtonLabel}>{loadingMore ? "Loading..." : `Load more (${assets.length}/${total})`}</Text>
      </Pressable>
    ) : null
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <SectionList
        sections={sections}
        keyExtractor={(row) => row.key}
        renderSectionHeader={({ section }) => (
          <View style={styles.groupHeaderRow}>
            <Text style={styles.groupTitle}>{section.title}</Text>
            {bulkMode ? (
              <Pressable onPress={() => toggleGroupSelection(section.allItems)} style={styles.groupSelectButton}>
                <Text style={styles.groupSelectButtonLabel}>
                  {section.allItems.every((item) => selectedIdSet.has(item.id)) ? "Clear all" : "Select all"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
        renderItem={({ item: row }) => (
          <View style={styles.groupGrid}>
            {row.items.map((asset) => (
              <VaultAssetCard
                key={asset.id}
                asset={asset}
                bulkMode={bulkMode}
                bulkDeleting={bulkDeleting}
                isSelected={isSelected(asset.id)}
                onToggleSelection={handleToggleSelectionAsset}
                onPreview={handlePreviewAsset}
                onOpenActions={handleOpenActionsAsset}
              />
            ))}
            {row.items.length < 2 ? <View style={styles.assetCardSpacer} /> : null}
          </View>
        )}
        stickySectionHeadersEnabled
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        contentContainerStyle={styles.container}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
      />

      <Modal visible={Boolean(previewAsset)} transparent animationType="fade" onRequestClose={() => setPreviewAsset(null)}>
        <View style={styles.previewBackdrop}>
          <View style={styles.previewSheet}>
            <Pressable onPress={() => setPreviewAsset(null)} style={styles.closeButton}>
              <Text style={styles.closeButtonLabel}>Close</Text>
            </Pressable>
            {previewAsset ? <Image source={{ uri: previewAsset.hdUrl || previewAsset.lowResUrl }} style={styles.previewImage} /> : null}
            {previewAsset ? <Text style={styles.previewMeta}>{previewAsset.tool}{previewAsset.variant ? ` • ${previewAsset.variant}` : ""}</Text> : null}
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(actionAsset)} transparent animationType="fade" onRequestClose={() => setActionAsset(null)}>
        <View style={styles.previewBackdrop}>
          <View style={styles.actionSheet}>
            <Text style={styles.actionSheetTitle}>Asset actions</Text>

            {actionAsset?.sourceType === "report" ? (
              <>
                <Pressable
                  onPress={() => {
                    if (!actionAsset) return;
                    openSource(actionAsset);
                    setActionAsset(null);
                  }}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonLabel}>Open source report</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (!actionAsset) return;
                    void openStudioAction(actionAsset, "makeup");
                    setActionAsset(null);
                  }}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonLabel}>Open makeup studio</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (!actionAsset) return;
                    void openStudioAction(actionAsset, "hair");
                    setActionAsset(null);
                  }}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonLabel}>Open hair studio</Text>
                </Pressable>
              </>
            ) : null}

            <Pressable
              onPress={() => {
                if (!actionAsset) return;
                handleRemoveAsset(actionAsset);
                setActionAsset(null);
              }}
              disabled={Boolean(actionAsset && removingId === actionAsset.id)}
              style={[
                styles.actionButton,
                styles.actionButtonDanger,
                actionAsset && removingId === actionAsset.id ? styles.actionButtonDisabled : null,
              ]}
            >
              <Text style={styles.actionButtonDangerLabel}>
                {actionAsset && removingId === actionAsset.id ? "Removing..." : "Remove from vault"}
              </Text>
            </Pressable>

            <Pressable onPress={() => setActionAsset(null)} style={styles.actionButtonSecondary}>
              <Text style={styles.actionButtonSecondaryLabel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    backgroundColor: "#fffafc",
  },
  container: {
    padding: 20,
    gap: 12,
    paddingBottom: 24,
  },
  listHeader: {
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    color: "#6b7280",
    lineHeight: 21,
  },
  perfPanelWrap: {
    gap: 8,
  },
  perfToolbar: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  perfToggleButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#ffffff",
  },
  perfToggleLabel: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "700",
  },
  perfClearButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fff1f2",
  },
  perfClearLabel: {
    color: "#be123c",
    fontSize: 12,
    fontWeight: "700",
  },
  perfRecordToggleButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#eff6ff",
  },
  perfRecordToggleLabel: {
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: "700",
  },
  perfSlowToggleButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#ffffff",
  },
  perfSlowToggleButtonActive: {
    borderColor: "#fca5a5",
    backgroundColor: "#fef2f2",
  },
  perfSlowToggleLabel: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "700",
  },
  perfSlowToggleLabelActive: {
    color: "#b91c1c",
  },
  perfPanel: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    padding: 10,
    gap: 6,
  },
  perfThresholdHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  perfThresholdHeaderLabel: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 12,
  },
  perfThresholdResetButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  perfThresholdResetLabel: {
    color: "#374151",
    fontWeight: "700",
    fontSize: 11,
  },
  perfPresetRow: {
    flexDirection: "row",
    gap: 8,
  },
  perfPresetButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  perfPresetLabel: {
    color: "#374151",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  perfThresholdRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 8,
    gap: 6,
  },
  perfThresholdOpLabel: {
    color: "#374151",
    fontWeight: "700",
    fontSize: 11,
    textTransform: "uppercase",
  },
  perfThresholdControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  perfThresholdButton: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  perfThresholdButtonLabel: {
    color: "#374151",
    fontWeight: "700",
    fontSize: 12,
  },
  perfThresholdValueLabel: {
    color: "#111827",
    fontWeight: "600",
    fontSize: 11,
    minWidth: 48,
  },
  perfDivider: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginVertical: 2,
  },
  perfFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  perfFilterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  perfFilterChipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  perfFilterChipLabel: {
    color: "#374151",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  perfFilterChipLabelActive: {
    color: "#ffffff",
  },
  perfStatsCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fafafa",
    padding: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  perfBaselineToolbar: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  perfBaselineButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  perfBaselineButtonLabel: {
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: "700",
  },
  perfBaselineClearButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  perfBaselineClearLabel: {
    color: "#374151",
    fontSize: 11,
    fontWeight: "700",
  },
  perfStatsLabel: {
    color: "#374151",
    fontSize: 11,
    fontWeight: "600",
  },
  perfBaselineLabel: {
    color: "#1e3a8a",
    fontSize: 11,
    fontWeight: "600",
  },
  perfBaselineDeltaLabel: {
    color: "#7c2d12",
    fontSize: 11,
    fontWeight: "700",
  },
  perfWorstLabel: {
    color: "#7c2d12",
    fontSize: 11,
    fontWeight: "700",
  },
  perfRegressionLabel: {
    color: "#991b1b",
    fontSize: 11,
    fontWeight: "700",
  },
  perfEntryRow: {
    gap: 2,
  },
  perfEntryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  perfEntryLabel: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "700",
  },
  perfBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  perfBadgeFast: {
    backgroundColor: "#ecfdf3",
    borderWidth: 1,
    borderColor: "#86efac",
  },
  perfBadgeMedium: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
  perfBadgeSlow: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  perfBadgeLabel: {
    color: "#374151",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  perfEntryMeta: {
    color: "#6b7280",
    fontSize: 11,
  },
  bulkBar: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  bulkLabel: {
    color: "#374151",
    fontWeight: "600",
  },
  bulkActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bulkDeleteButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fff1f2",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  bulkDeleteButtonLabel: {
    color: "#be123c",
    fontWeight: "700",
    fontSize: 12,
  },
  bulkSelectVisibleButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  bulkSelectVisibleButtonLabel: {
    color: "#374151",
    fontWeight: "700",
    fontSize: 12,
  },
  bulkModeButton: {
    borderRadius: 999,
    backgroundColor: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  bulkModeButtonLabel: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
  },
  bulkActionDisabled: {
    opacity: 0.5,
  },
  bulkProgressCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bulkProgressText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 12,
  },
  bulkProgressMeta: {
    marginTop: 4,
    color: "#6b7280",
    fontSize: 11,
  },
  bulkRetryCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fed7aa",
    backgroundColor: "#fffbeb",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bulkRetryText: {
    color: "#9a3412",
    fontWeight: "600",
    fontSize: 12,
  },
  bulkRetryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#fdba74",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#ffffff",
  },
  bulkRetryButtonLabel: {
    color: "#9a3412",
    fontWeight: "700",
    fontSize: 12,
  },
  searchInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    color: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  sortRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#ffffff",
  },
  filterChipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  filterChipLabel: {
    color: "#374151",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  filterChipLabelActive: {
    color: "#ffffff",
  },
  sortChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#ffffff",
  },
  sortChipActive: {
    backgroundColor: "#374151",
    borderColor: "#374151",
  },
  sortChipLabel: {
    color: "#374151",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  sortChipLabelActive: {
    color: "#ffffff",
  },
  errorCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    padding: 14,
    gap: 6,
  },
  errorTitle: {
    color: "#991b1b",
    fontWeight: "700",
  },
  errorBody: {
    color: "#b91c1c",
  },
  retryButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  retryButtonLabel: {
    color: "#ffffff",
    fontWeight: "700",
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 4,
  },
  emptyTitle: {
    color: "#111827",
    fontWeight: "700",
  },
  emptyBody: {
    color: "#6b7280",
  },
  groupSection: {
    width: "100%",
    gap: 8,
  },
  groupTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
  groupHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fffafc",
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3e8ee",
    marginBottom: 8,
  },
  groupSelectButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  groupSelectButtonLabel: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "600",
  },
  groupGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  grid: {
    width: "100%",
    gap: 10,
  },
  assetCard: {
    width: "48%",
    gap: 5,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    padding: 8,
  },
  assetCardSpacer: {
    width: "48%",
  },
  assetImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
  },
  assetMeta: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "700",
  },
  assetDate: {
    color: "#6b7280",
    fontSize: 11,
  },
  sourceButton: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    paddingVertical: 6,
  },
  sourceButtonLabel: {
    color: "#374151",
    fontSize: 11,
    fontWeight: "600",
  },
  selectionButton: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    paddingVertical: 6,
    backgroundColor: "#ffffff",
  },
  selectionButtonActive: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },
  selectionButtonLabel: {
    color: "#374151",
    fontSize: 11,
    fontWeight: "600",
  },
  selectionButtonLabelActive: {
    color: "#ffffff",
  },
  actionSheet: {
    borderRadius: 16,
    backgroundColor: "#ffffff",
    padding: 12,
    gap: 8,
  },
  actionSheetTitle: {
    color: "#111827",
    fontWeight: "700",
    marginBottom: 4,
  },
  actionButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    alignItems: "center",
    paddingVertical: 10,
  },
  actionButtonLabel: {
    color: "#111827",
    fontWeight: "600",
  },
  actionButtonDanger: {
    borderColor: "#fecaca",
    backgroundColor: "#fff1f2",
  },
  actionButtonDangerLabel: {
    color: "#be123c",
    fontWeight: "700",
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonSecondary: {
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center",
    paddingVertical: 10,
  },
  actionButtonSecondaryLabel: {
    color: "#ffffff",
    fontWeight: "700",
  },
  loadMoreButton: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: "#111827",
    paddingVertical: 12,
    alignItems: "center",
  },
  loadMoreDisabled: {
    opacity: 0.5,
  },
  loadMoreButtonLabel: {
    color: "#ffffff",
    fontWeight: "700",
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.8)",
    justifyContent: "center",
    padding: 16,
  },
  previewSheet: {
    borderRadius: 16,
    backgroundColor: "#ffffff",
    padding: 12,
    gap: 8,
  },
  closeButton: {
    alignSelf: "flex-end",
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeButtonLabel: {
    color: "#111827",
    fontWeight: "700",
  },
  previewImage: {
    width: "100%",
    height: 520,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },
  previewMeta: {
    color: "#374151",
    fontWeight: "600",
  },
});
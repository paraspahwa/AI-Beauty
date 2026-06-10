import AsyncStorage from "@react-native-async-storage/async-storage";

const GUEST_PROGRESS_KEY = "rv_guest_progress";

export type TeaserType = "color_season" | "face_shape" | "unlock_analysis";

export type OnboardingProgress = {
  tryOnCount: number;
  sharedOnce: boolean;
  analysisUnlocked: boolean;
  revealedColorSeason: boolean;
  revealedFaceShape: boolean;
  pendingTeaser: TeaserType | null;
};

export type UnlockTeaser =
  | { type: "none" }
  | { type: TeaserType; message: string; ctaLabel: string; ctaHref: string };

const DEFAULT: OnboardingProgress = {
  tryOnCount: 0,
  sharedOnce: false,
  analysisUnlocked: false,
  revealedColorSeason: false,
  revealedFaceShape: false,
  pendingTeaser: null,
};

export function parseOnboardingProgress(raw: unknown): OnboardingProgress {
  if (!raw || typeof raw !== "object") return { ...DEFAULT };
  const o = raw as Record<string, unknown>;
  const pending = o.pendingTeaser;
  const validPending =
    pending === "color_season" || pending === "face_shape" || pending === "unlock_analysis"
      ? pending
      : null;
  return {
    tryOnCount: typeof o.tryOnCount === "number" ? o.tryOnCount : 0,
    sharedOnce: o.sharedOnce === true,
    analysisUnlocked: o.analysisUnlocked === true,
    revealedColorSeason: o.revealedColorSeason === true,
    revealedFaceShape: o.revealedFaceShape === true,
    pendingTeaser: validPending,
  };
}

function pickPendingTeaser(
  tryOnCount: number,
  sharedOnce: boolean,
  hints?: { season?: string; faceShape?: string },
): TeaserType | null {
  if (sharedOnce || tryOnCount >= 3) return "unlock_analysis";
  if (tryOnCount >= 2 && hints?.faceShape) return "face_shape";
  if (tryOnCount >= 1 && hints?.season) return "color_season";
  if (tryOnCount >= 1) return "color_season";
  return null;
}

function buildTeaserMessage(
  type: TeaserType,
  hints?: { season?: string; faceShape?: string },
): string {
  switch (type) {
    case "color_season":
      return hints?.season
        ? `You might be a ${hints.season} — try one more look to reveal your face shape.`
        : "Your color season is taking shape — try another look to learn more.";
    case "face_shape":
      return hints?.faceShape
        ? `Your face shape looks like ${hints.faceShape} — unlock your full Style DNA to see why each look suits you.`
        : "Your face shape insight is ready — unlock your full analysis to see the why.";
    case "unlock_analysis":
      return "Ready for your full beauty analysis? Unlock skin routine, hairstyle guide, and Style DNA.";
  }
}

export function getUnlockTeaser(
  progress: OnboardingProgress,
  hints?: { season?: string; faceShape?: string },
): UnlockTeaser {
  if (progress.analysisUnlocked && !progress.pendingTeaser) return { type: "none" };
  if (progress.pendingTeaser) {
    return {
      type: progress.pendingTeaser,
      message: buildTeaserMessage(progress.pendingTeaser, hints),
      ctaLabel: progress.pendingTeaser === "unlock_analysis" ? "Unlock analysis" : "Keep exploring",
      ctaHref: progress.pendingTeaser === "unlock_analysis" ? "/upload" : "/studio",
    };
  }
  return { type: "none" };
}

export async function readGuestProgress(): Promise<OnboardingProgress> {
  try {
    const raw = await AsyncStorage.getItem(GUEST_PROGRESS_KEY);
    return raw ? parseOnboardingProgress(JSON.parse(raw)) : { ...DEFAULT };
  } catch {
    return { ...DEFAULT };
  }
}

async function writeGuestProgress(progress: OnboardingProgress): Promise<void> {
  await AsyncStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(progress));
}

export function nextProgressAfterTryOn(
  current: OnboardingProgress,
  hints?: { season?: string; faceShape?: string },
): OnboardingProgress {
  const tryOnCount = current.tryOnCount + 1;
  const pendingTeaser = pickPendingTeaser(tryOnCount, current.sharedOnce, hints);
  return {
    ...current,
    tryOnCount,
    pendingTeaser,
    revealedColorSeason: current.revealedColorSeason || tryOnCount >= 1,
    revealedFaceShape: current.revealedFaceShape || tryOnCount >= 2,
    analysisUnlocked: current.analysisUnlocked || tryOnCount >= 3 || current.sharedOnce,
  };
}

export async function guestTryOn(hints?: { season?: string; faceShape?: string }): Promise<{ progress: OnboardingProgress; teaser: UnlockTeaser }> {
  const current = await readGuestProgress();
  const next = nextProgressAfterTryOn(current, hints);
  await writeGuestProgress(next);
  return { progress: next, teaser: getUnlockTeaser(next, hints) };
}

export async function guestShare(): Promise<{ progress: OnboardingProgress; teaser: UnlockTeaser }> {
  const current = await readGuestProgress();
  const next: OnboardingProgress = {
    ...current,
    sharedOnce: true,
    analysisUnlocked: true,
    pendingTeaser: "unlock_analysis",
  };
  await writeGuestProgress(next);
  return { progress: next, teaser: getUnlockTeaser(next) };
}

export async function guestDismissTeaser(): Promise<void> {
  const current = await readGuestProgress();
  const next = { ...current, pendingTeaser: null as TeaserType | null };
  if (current.pendingTeaser === "color_season") next.revealedColorSeason = true;
  if (current.pendingTeaser === "face_shape") next.revealedFaceShape = true;
  await writeGuestProgress(next);
}

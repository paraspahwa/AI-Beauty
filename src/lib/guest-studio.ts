import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import {
  DEFAULT_ONBOARDING_PROGRESS,
  parseOnboardingProgress,
  type OnboardingProgress,
} from "@/lib/progressive-unlock";

export const GUEST_STUDIO_COOKIE = "rv_guest_studio";
export const GUEST_TRYON_LIMIT = 3;

export interface GuestStudioState {
  guestId: string;
  tryOnCount: number;
  canvasId?: string;
  selfiePath?: string;
  photoUrl?: string;
  onboardingProgress?: OnboardingProgress;
}

function signPayload(payload: string): string {
  return createHmac("sha256", env.internal.secret).update(payload).digest("base64url");
}

function parsePayloadObject(o: Record<string, unknown>): GuestStudioState | null {
  if (typeof o.guestId !== "string") return null;
  const progress = o.onboardingProgress
    ? parseOnboardingProgress(o.onboardingProgress)
    : parseOnboardingProgress({ tryOnCount: typeof o.tryOnCount === "number" ? o.tryOnCount : 0 });
  return {
    guestId: o.guestId,
    tryOnCount: progress.tryOnCount,
    canvasId: typeof o.canvasId === "string" ? o.canvasId : undefined,
    selfiePath: typeof o.selfiePath === "string" ? o.selfiePath : undefined,
    photoUrl: typeof o.photoUrl === "string" ? o.photoUrl : undefined,
    onboardingProgress: progress,
  };
}

function parseLegacyJson(raw: string): GuestStudioState | null {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    return parsePayloadObject(o);
  } catch {
    return null;
  }
}

function parseState(raw: string | undefined): GuestStudioState | null {
  if (!raw) return null;

  const dot = raw.lastIndexOf(".");
  if (dot > 0) {
    const payloadB64 = raw.slice(0, dot);
    const sig = raw.slice(dot + 1);
    try {
      const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
      const expected = signPayload(payload);
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      if (a.length === b.length && timingSafeEqual(a, b)) {
        return parseLegacyJson(payload);
      }
    } catch {
      // fall through to legacy unsigned JSON
    }
  }

  return parseLegacyJson(raw);
}

export async function getGuestStudioState(): Promise<GuestStudioState | null> {
  const jar = await cookies();
  return parseState(jar.get(GUEST_STUDIO_COOKIE)?.value);
}

/** Cookie (httpOnly web) wins for quota; header (mobile) must be signed or merged with cookie. */
export function getGuestStudioStateFromRequest(req: NextRequest): GuestStudioState | null {
  const cookieState = parseState(req.cookies.get(GUEST_STUDIO_COOKIE)?.value);
  const headerState = parseState(req.headers.get("x-guest-studio-state") ?? undefined);

  if (cookieState && headerState) {
    const tryOnCount = Math.max(cookieState.tryOnCount, headerState.tryOnCount);
    return {
      ...cookieState,
      tryOnCount,
      selfiePath: cookieState.selfiePath ?? headerState.selfiePath,
      photoUrl: cookieState.photoUrl ?? headerState.photoUrl,
      canvasId: cookieState.canvasId ?? headerState.canvasId,
      onboardingProgress: cookieState.onboardingProgress ?? headerState.onboardingProgress,
    };
  }

  return cookieState ?? headerState;
}

export function serializeGuestState(state: GuestStudioState): string {
  const payload = JSON.stringify({
    guestId: state.guestId,
    tryOnCount: state.tryOnCount,
    canvasId: state.canvasId,
    selfiePath: state.selfiePath,
    photoUrl: state.photoUrl,
    onboardingProgress: state.onboardingProgress,
  });
  const sig = signPayload(payload);
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${sig}`;
}

export function createGuestState(): GuestStudioState {
  return {
    guestId: crypto.randomUUID(),
    tryOnCount: 0,
    onboardingProgress: { ...DEFAULT_ONBOARDING_PROGRESS },
  };
}

export function canGuestTryOn(state: GuestStudioState): boolean {
  return state.tryOnCount < GUEST_TRYON_LIMIT;
}

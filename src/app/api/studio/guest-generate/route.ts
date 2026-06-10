import { NextRequest, NextResponse } from "next/server";
import { createFalClient } from "@fal-ai/client";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import {
  GUEST_STUDIO_COOKIE,
  GUEST_TRYON_LIMIT,
  getGuestStudioStateFromRequest,
  serializeGuestState,
  canGuestTryOn,
} from "@/lib/guest-studio";
import { MAKEUP_STYLES, type MakeupStyleValue } from "@/lib/makeup-options";
import { resolveGuestHairParams } from "@/lib/guest-hair-presets";
import {
  getUnlockTeaser,
  nextProgressAfterTryOn,
  parseOnboardingProgress,
} from "@/lib/progressive-unlock";

export const runtime = "nodejs";
export const maxDuration = 60;

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

type FalImageOutput = {
  data?: { image?: { url?: string }; images?: { url: string }[] };
  image?: { url?: string };
  images?: { url: string }[];
};

function extractFalImageUrl(result: FalImageOutput): string | undefined {
  return result.data?.images?.[0]?.url
    ?? result.data?.image?.url
    ?? result.images?.[0]?.url
    ?? result.image?.url;
}

export async function POST(request: NextRequest) {
  try {
    env.assertServer();
    if (!env.fal.isConfigured) {
      return NextResponse.json({ error: "Studio unavailable" }, { status: 503 });
    }

    const state = getGuestStudioStateFromRequest(request);
    if (!state?.selfiePath || !state.photoUrl) {
      return NextResponse.json({ error: "Upload a selfie first" }, { status: 400 });
    }
    if (!canGuestTryOn(state)) {
      return NextResponse.json(
        { error: "Free try-on limit reached. Sign in to save your looks.", code: "GUEST_QUOTA" },
        { status: 429 },
      );
    }

    const body = (await request.json()) as { mode?: string; makeupStyle?: string; hairVariant?: string };
    const mode = body.mode === "hair" ? "hair" : "makeup";
    const admin = createSupabaseAdminClient();
    const { data: imgData } = await admin.storage.from(env.supabase.bucket).download(state.selfiePath);
    if (!imgData) return NextResponse.json({ error: "Image unavailable" }, { status: 422 });

    const fal = createFalClient({ credentials: env.fal.apiKey });

    let resultUrl: string | undefined;

    if (mode === "makeup") {
      const style = (MAKEUP_STYLES.includes(body.makeupStyle as MakeupStyleValue)
        ? body.makeupStyle
        : "natural") as MakeupStyleValue;
      const result = await fal.run("fal-ai/image-apps-v2/makeup-application", {
        input: {
          image_url: state.photoUrl,
          makeup_style: style,
          intensity: "medium",
        },
      }) as FalImageOutput;
      resultUrl = extractFalImageUrl(result);
    } else {
      const hairParams = resolveGuestHairParams(body.hairVariant);
      const result = await fal.run("fal-ai/image-apps-v2/hair-change", {
        input: {
          image_url: state.photoUrl,
          hair_color: hairParams.hair_color,
          hair_style: hairParams.hair_style,
        },
      }) as FalImageOutput;
      resultUrl = extractFalImageUrl(result);
    }

    if (!resultUrl) {
      return NextResponse.json({ error: "Generation failed" }, { status: 502 });
    }

    const currentProgress =
      state.onboardingProgress ??
      parseOnboardingProgress({ tryOnCount: state.tryOnCount });
    const nextProgress = nextProgressAfterTryOn(currentProgress);
    const nextState = {
      ...state,
      tryOnCount: nextProgress.tryOnCount,
      onboardingProgress: nextProgress,
    };
    const teaser = getUnlockTeaser(nextProgress);
    const res = NextResponse.json({
      lowResUrl: resultUrl,
      hdUrl: resultUrl,
      remaining: GUEST_TRYON_LIMIT - nextState.tryOnCount,
      requiresAuth: nextState.tryOnCount >= GUEST_TRYON_LIMIT,
      guestState: serializeGuestState(nextState),
      progress: nextProgress,
      teaser,
    });

    res.cookies.set(GUEST_STUDIO_COOKIE, serializeGuestState(nextState), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("[POST /api/studio/guest-generate]", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { env } from "@/lib/env";
import {
  parseOnboardingProgress,
  nextProgressAfterTryOn,
  nextProgressAfterShare,
  dismissTeaser,
  getUnlockTeaser,
} from "@/lib/progressive-unlock";

export const runtime = "nodejs";

type Body =
  | { action: "try_on"; season?: string; faceShape?: string }
  | { action: "share" }
  | { action: "dismiss" }
  | { action: "merge_guest"; guestCount: number };

export async function GET(req: NextRequest) {
  try {
    env.assertServer();
    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ progress: null, teaser: { type: "none" } });

    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("user_style_prefs")
      .select("prefs, color_season, face_shape")
      .eq("user_id", user.id)
      .maybeSingle();

    const prefs = (data?.prefs ?? {}) as Record<string, unknown>;
    const progress = parseOnboardingProgress(prefs.onboardingProgress);
    const teaser = getUnlockTeaser(progress, {
      season: data?.color_season ?? undefined,
      faceShape: data?.face_shape ?? undefined,
    });

    return NextResponse.json({ progress, teaser });
  } catch (err) {
    console.error("[GET /api/studio/progress]", err);
    return NextResponse.json({ error: "Failed to load progress" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    env.assertServer();
    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as Body;
    const admin = createSupabaseAdminClient();

    const { data } = await admin
      .from("user_style_prefs")
      .select("prefs, color_season, face_shape")
      .eq("user_id", user.id)
      .maybeSingle();

    const prefs = { ...((data?.prefs ?? {}) as Record<string, unknown>) };
    const current = parseOnboardingProgress(prefs.onboardingProgress);
    const hints = {
      season: "season" in body ? body.season : data?.color_season ?? undefined,
      faceShape: "faceShape" in body ? body.faceShape : data?.face_shape ?? undefined,
    };

    let next = current;
    if (body.action === "share") {
      next = nextProgressAfterShare(current);
    } else if (body.action === "dismiss") {
      next = dismissTeaser(current);
    } else if (body.action === "merge_guest") {
      const guestCount = typeof body.guestCount === "number" ? body.guestCount : 0;
      if (guestCount > current.tryOnCount) {
        next = { ...current };
        for (let i = current.tryOnCount; i < guestCount; i++) {
          next = nextProgressAfterTryOn(next, hints);
        }
      }
    } else {
      next = nextProgressAfterTryOn(current, hints);
    }

    prefs.onboardingProgress = next;

    await admin.rpc("upsert_style_prefs", {
      p_user_id: user.id,
      p_color_season: data?.color_season ?? null,
      p_undertone: null,
      p_face_shape: data?.face_shape ?? null,
      p_skin_type: null,
      p_prefs: prefs,
    });

    const teaser = getUnlockTeaser(next, hints);

    return NextResponse.json({ progress: next, teaser });
  } catch (err) {
    console.error("[POST /api/studio/progress]", err);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
}

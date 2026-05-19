import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { compressForAI } from "@/lib/ai/image";
import { chatJSON } from "@/lib/ai/openai";
import { buildColorAnalysisPrompt } from "@/prompts";
import type { ColorAnalysisResult } from "@/types/report";

export const runtime = "nodejs";
export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    env.assertServer();

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({} as { canvasId?: string }));
    if (!body.canvasId || !UUID_RE.test(body.canvasId)) {
      return NextResponse.json({ error: "canvasId required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: canvas } = await admin
      .from("studio_canvases")
      .select("id, user_id, selfie_path")
      .eq("id", body.canvasId)
      .single();
    if (!canvas) return NextResponse.json({ error: "Canvas not found" }, { status: 404 });
    if (canvas.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: imgData, error: imgErr } = await admin.storage
      .from(env.supabase.bucket)
      .download(canvas.selfie_path as string);
    if (imgErr || !imgData) return NextResponse.json({ error: "Image unavailable" }, { status: 422 });

    const compressed = await compressForAI(Buffer.from(await imgData.arrayBuffer()));
    const analysis = await chatJSON<ColorAnalysisResult>({
      model: env.openai.visionModel,
      system: "You are Renovaara. Return strict JSON only.",
      user: buildColorAnalysisPrompt(),
      imageBase64: compressed.toString("base64"),
      temperature: 0.2,
    });

    await admin
      .from("studio_canvases")
      .update({
        color_palette: {
          season: analysis.season,
          undertone: analysis.undertone,
          palette: analysis.palette,
          avoidColors: analysis.avoidColors,
        },
      })
      .eq("id", body.canvasId)
      .eq("user_id", user.id);

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("[studio/scan-color]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
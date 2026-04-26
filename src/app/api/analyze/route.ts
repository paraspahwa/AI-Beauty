import { NextResponse, type NextRequest } from "next/server";
import { runAnalysisPipeline } from "@/lib/ai/pipeline";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/analyze
 * Body: multipart/form-data with field `image`
 * Returns: { reportId }
 *
 * Flow:
 *  1. Authenticate user via Supabase session.
 *  2. Persist the original image to private storage (`<userId>/<reportId>.jpg`).
 *  3. Insert a `processing` report row.
 *  4. Run the analysis pipeline.
 *  5. Update the row with results (status='ready') or the error (status='failed').
 */
export async function POST(req: NextRequest) {
  try {
    env.assertServer();

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large (max 8MB)" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Use admin client for writes — RLS still checked via user_id ownership semantics.
    const admin = createSupabaseAdminClient();

    // 1) Insert pending report to get an id
    const { data: report, error: insertErr } = await admin
      .from("reports")
      .insert({ user_id: user.id, image_path: "pending", status: "processing" })
      .select("id")
      .single();
    if (insertErr || !report) throw insertErr ?? new Error("Failed to create report");

    const imagePath = `${user.id}/${report.id}.jpg`;

    // 2) Upload original image to private bucket
    const { error: upErr } = await admin.storage
      .from(env.supabase.bucket)
      .upload(imagePath, buffer, { contentType: "image/jpeg", upsert: true });
    if (upErr) throw upErr;

    await admin.from("reports").update({ image_path: imagePath }).eq("id", report.id);

    // 3) Run pipeline (synchronous within request — Vercel allows up to maxDuration)
    try {
      const result = await runAnalysisPipeline(buffer);

      await admin.from("reports").update({
        status: "ready",
        rekognition: result.rekognition as object,
        face_shape: result.faceShape,
        color_analysis: result.colorAnalysis,
        skin_analysis: result.skinAnalysis,
        features: result.features,
        glasses: result.glasses,
        hairstyle: result.hairstyle,
        summary: result.summary,
      }).eq("id", report.id);

      // Flatten a couple of recommendations for sharing/search
      await admin.from("recommendations").insert([
        { report_id: report.id, category: "color", title: result.colorAnalysis.season, description: result.colorAnalysis.description, data: result.colorAnalysis },
        { report_id: report.id, category: "glasses", title: "Spectacles guide", data: result.glasses },
        { report_id: report.id, category: "hair", title: "Hairstyle guide", data: result.hairstyle },
      ]);
    } catch (pipelineErr) {
      console.error("[analyze] pipeline failed:", pipelineErr);
      await admin.from("reports").update({
        status: "failed",
        error: (pipelineErr as Error).message?.slice(0, 500),
      }).eq("id", report.id);
      return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
    }

    return NextResponse.json({ reportId: report.id });
  } catch (err) {
    console.error("[POST /api/analyze]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

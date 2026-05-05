import {
  RekognitionClient,
  DetectFacesCommand,
  type FaceDetail,
} from "@aws-sdk/client-rekognition";
import { env } from "../env";

let cached: RekognitionClient | null = null;
function client() {
  if (!cached) {
    cached = new RekognitionClient({
      region: env.aws.region,
      credentials:
        env.aws.accessKeyId && env.aws.secretAccessKey
          ? {
              accessKeyId: env.aws.accessKeyId,
              secretAccessKey: env.aws.secretAccessKey,
            }
          : undefined,
    });
  }
  return cached;
}

/** Run Rekognition DetectFaces and return the highest-confidence face details. */
export async function detectFaceDetails(imageBytes: Buffer): Promise<FaceDetail | null> {
  const cmd = new DetectFacesCommand({
    Image: { Bytes: imageBytes },
    // Phase 4.1: Use ALL attributes to get AgeRange, Eyeglasses, EyesOpen, Emotions
    // for injection into the Features and Glasses prompts.
    // Cost is identical to DEFAULT — only the response payload differs.
    Attributes: ["ALL"],
  });
  const result = await client().send(cmd);
  const faces = (result.FaceDetails ?? []).slice().sort(
    (a, b) => (b.Confidence ?? 0) - (a.Confidence ?? 0),
  );
  return faces[0] ?? null;
}

import OpenAI from "openai";
import { env } from "../env";

let cached: OpenAI | null = null;
export function getOpenAI() {
  if (!cached) {
    if (!env.openai.apiKey) throw new Error("OPENAI_API_KEY is required");
    cached = new OpenAI({ apiKey: env.openai.apiKey });
  }
  return cached;
}

/**
 * Call the chat completions API and parse JSON from the response.
 * The prompt MUST instruct the model to return strict JSON.
 */
export async function chatJSON<T>(opts: {
  model: string;
  system: string;
  user: string;
  imageBase64?: string;
  temperature?: number;
}): Promise<T> {
  const client = getOpenAI();

  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    { type: "text", text: opts.user },
  ];
  if (opts.imageBase64) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${opts.imageBase64}`, detail: "high" },
    });
  }

  const completion = await client.chat.completions.create({
    model: opts.model,
    temperature: opts.temperature ?? 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: userContent },
    ],
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenAI returned empty content");

  try {
    return JSON.parse(content) as T;
  } catch (err) {
    throw new Error(`Failed to parse OpenAI JSON: ${(err as Error).message}\n${content}`);
  }
}

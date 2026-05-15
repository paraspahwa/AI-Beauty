import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const OUTPUT_DIR = path.join(process.cwd(), "public", "samples");
const MODEL = "bytedance/seedream-4.5";

const IMAGES = [
  // TOPS — Do
  { file: "seedream-wrap-dress.jpg",    prompt: "A woman wearing a navy blue wrap dress with a defined waist, studio white background, fashion photography, flattering fit, elegant" },
  { file: "seedream-fitted-waist.jpg",  prompt: "A woman wearing a slightly fitted waist top in olive green, studio white background, fashion photography, elegant silhouette" },
  { file: "seedream-a-line.jpg",        prompt: "A woman wearing a floral A-line top with structured shoulders, studio white background, fashion photography" },
  { file: "seedream-vertical-seam.jpg", prompt: "A woman wearing a black jacket with visible vertical seams, studio white background, fashion photography, tailored look" },
  // TOPS — Avoid
  { file: "seedream-bodycon.jpg",       prompt: "A woman wearing a very tight bodycon top, studio white background, fashion photography" },
  { file: "seedream-empire-waist.jpg",  prompt: "A woman wearing an empire waist top with fabric gathered under the bust, studio white background, fashion photography" },
  { file: "seedream-boxy.jpg",          prompt: "A woman wearing an oversized boxy grey t-shirt, studio white background, fashion photography" },
  { file: "seedream-clingy.jpg",        prompt: "A woman wearing a thin clingy pink spaghetti strap top, studio white background, fashion photography" },
  // BOTTOMS — Do
  { file: "seedream-wide-leg.jpg",      prompt: "A woman wearing wide-leg beige trousers, studio white background, fashion photography, elegant" },
  { file: "seedream-straight-pant.jpg", prompt: "A woman wearing straight cut black pants, studio white background, fashion photography" },
  { file: "seedream-a-line-skirt.jpg",  prompt: "A woman wearing a sage green A-line midi skirt, studio white background, fashion photography" },
  { file: "seedream-flared-jean.jpg",   prompt: "A woman wearing flared blue jeans, studio white background, fashion photography" },
  // BOTTOMS — Avoid
  { file: "seedream-tight-bottom.jpg",  prompt: "A woman wearing very tight high waist jeans, studio white background, fashion photography" },
  { file: "seedream-low-rise.jpg",      prompt: "A woman wearing low-rise skinny jeans, studio white background, fashion photography" },
  { file: "seedream-short-skirt.jpg",   prompt: "A woman wearing a very short mini skirt, studio white background, fashion photography" },
  { file: "seedream-baggy.jpg",         prompt: "A woman wearing extremely baggy cargo pants, studio white background, fashion photography" },
  // NECKLINES — Do
  { file: "seedream-v-neck.jpg",        prompt: "A woman wearing a black deep V-neck top, studio white background, fashion photography, elegant neckline" },
  { file: "seedream-wrap-neck.jpg",     prompt: "A woman wearing a green wrap neckline top, studio white background, fashion photography" },
  { file: "seedream-scoop-neck.jpg",    prompt: "A woman wearing a pink scoop neck top, studio white background, fashion photography" },
  { file: "seedream-square-neck.jpg",   prompt: "A woman wearing a white square neck top, studio white background, fashion photography" },
  // NECKLINES — Avoid
  { file: "seedream-high-neck.jpg",     prompt: "A woman wearing a beige turtleneck high neck top, studio white background, fashion photography" },
  { file: "seedream-crew-neck.jpg",     prompt: "A woman wearing a black crew neck t-shirt, studio white background, fashion photography" },
  { file: "seedream-halter-neck.jpg",   prompt: "A woman wearing a black halter neck top, studio white background, fashion photography" },
  { file: "seedream-boat-neck.jpg",     prompt: "A woman wearing a beige high boat neck top, studio white background, fashion photography" },
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const proto = url.startsWith("https") ? https : http;
    proto.get(url, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function replicateRequest(method, reqPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: "api.replicate.com",
      path: reqPath,
      method,
      headers: {
        "Authorization": `Token ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
      },
    }, res => {
      let raw = "";
      res.on("data", chunk => { raw += chunk; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch (e) { reject(new Error("Bad JSON: " + raw)); }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function generateImage(prompt) {
  // Create prediction with bytedance/seedream-4.5
  let attempt = 0;
  let prediction;
  while (true) {
    attempt++;
    const { status, body } = await replicateRequest("POST", `/v1/models/${MODEL}/predictions`, {
      input: {
        prompt,
        aspect_ratio: "2:3",
        size: "2K",
      },
    });

    if (status === 429) {
      const waitSecs = (body.retry_after || 15) + 3;
      console.log(`\n  [rate-limit] waiting ${waitSecs}s before retry ${attempt}...`);
      await sleep(waitSecs * 1000);
      continue;
    }
    if (status !== 200 && status !== 201) {
      throw new Error(`HTTP ${status}: ${JSON.stringify(body)}`);
    }
    prediction = body;
    break;
  }

  // Poll for completion
  while (prediction.status !== "succeeded" && prediction.status !== "failed") {
    await sleep(4000);
    const { status, body } = await replicateRequest("GET", `/v1/predictions/${prediction.id}`);
    if (status === 429) {
      const waitSecs = (body.retry_after || 15) + 3;
      console.log(`\n  [rate-limit on poll] waiting ${waitSecs}s...`);
      await sleep(waitSecs * 1000);
      continue;
    }
    prediction = body;
  }

  if (prediction.status === "failed") {
    throw new Error("Prediction failed: " + JSON.stringify(prediction.error));
  }

  const output = prediction.output;
  return Array.isArray(output) ? output[0] : output;
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let done = 0;
  let failed = 0;
  for (const { file, prompt } of IMAGES) {
    const dest = path.join(OUTPUT_DIR, file);
    if (fs.existsSync(dest)) {
      console.log(`[skip] ${file}`);
      done++;
      continue;
    }
    try {
      process.stdout.write(`[gen]  ${file} ... `);
      const url = await generateImage(prompt);
      await downloadFile(url, dest);
      const kb = (fs.statSync(dest).size / 1024).toFixed(0);
      console.log(`saved (${kb} KB)`);
      done++;
      // Stay well under 6 req/min limit (1 per 11s)
      await sleep(11000);
    } catch (err) {
      console.log(`FAILED`);
      console.error(`  -> ${err.message}`);
      failed++;
    }
  }
  console.log(`\n=== Done: ${done} saved, ${failed} failed / ${IMAGES.length} total ===`);
}

main();

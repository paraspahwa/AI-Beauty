#!/usr/bin/env node
// One-shot script to neutralize legacy pink/lavender/cream literal colors in src/.
// Maps brand pinks/violets → ink (#111827) and pale tints → near-white (#fffafc / #f9fafb).
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = "src";
const EXTS = new Set([".ts", ".tsx", ".css", ".js", ".jsx", ".md"]);

// Hex maps (case-insensitive)
const DARK_HEX = [
  "EC4899", "DB2777", "BE185D", "9D174D", "831843",
  "F472B6", "8B5CF6", "6D28D9", "9333EA", "7C3AED",
  "A21CAF", "9B7CB6", "F97316", "0EA5A4", "14B8A6",
  "22D3EE", "be185d", "FB7185", "F43F5E",
];
const LIGHT_HEX = [
  "F9A8D4", "FBCFE8", "FCE7F3", "FBE7F2", "FDF2F8",
  "FFF7FB", "EDE9FE", "DDD6FE", "C4B5FD", "FEF3C7",
  "FEFBF8", "FBCFE8", "FFE4F1",
];

const DARK_REGEX = new RegExp(`#(?:${DARK_HEX.join("|")})\\b`, "gi");
const LIGHT_REGEX = new RegExp(`#(?:${LIGHT_HEX.join("|")})\\b`, "gi");

// rgba() neutralizations — pink/violet/cream tinted alphas → ink-based alphas
const RGBA_PATTERNS = [
  // ec4899 / db2777 / be185d / 9d174d / 831843 pinks
  { re: /rgba\(\s*236\s*,\s*72\s*,\s*153\s*,\s*([0-9.]+)\s*\)/gi, repl: (_m, a) => `rgba(17,24,39,${a})` },
  { re: /rgba\(\s*219\s*,\s*39\s*,\s*119\s*,\s*([0-9.]+)\s*\)/gi, repl: (_m, a) => `rgba(17,24,39,${a})` },
  { re: /rgba\(\s*190\s*,\s*24\s*,\s*93\s*,\s*([0-9.]+)\s*\)/gi, repl: (_m, a) => `rgba(17,24,39,${a})` },
  { re: /rgba\(\s*157\s*,\s*23\s*,\s*77\s*,\s*([0-9.]+)\s*\)/gi, repl: (_m, a) => `rgba(17,24,39,${a})` },
  { re: /rgba\(\s*131\s*,\s*24\s*,\s*67\s*,\s*([0-9.]+)\s*\)/gi, repl: (_m, a) => `rgba(17,24,39,${a})` },
  // 8B5CF6 / 6D28D9 / 7C3AED violets
  { re: /rgba\(\s*139\s*,\s*92\s*,\s*246\s*,\s*([0-9.]+)\s*\)/gi, repl: (_m, a) => `rgba(17,24,39,${a})` },
  { re: /rgba\(\s*109\s*,\s*40\s*,\s*217\s*,\s*([0-9.]+)\s*\)/gi, repl: (_m, a) => `rgba(17,24,39,${a})` },
  { re: /rgba\(\s*124\s*,\s*58\s*,\s*237\s*,\s*([0-9.]+)\s*\)/gi, repl: (_m, a) => `rgba(17,24,39,${a})` },
  // 201,149,107 (camel) / 232,200,144 (cream) / 123,110,158 (lavender)
  { re: /rgba\(\s*201\s*,\s*149\s*,\s*107\s*,\s*([0-9.]+)\s*\)/gi, repl: (_m, a) => `rgba(17,24,39,${a})` },
  { re: /rgba\(\s*232\s*,\s*200\s*,\s*144\s*,\s*([0-9.]+)\s*\)/gi, repl: (_m, a) => `rgba(17,24,39,${a})` },
  { re: /rgba\(\s*123\s*,\s*110\s*,\s*158\s*,\s*([0-9.]+)\s*\)/gi, repl: (_m, a) => `rgba(17,24,39,${a})` },
];

let changed = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      walk(p);
    } else if (EXTS.has(extname(name))) {
      processFile(p);
    }
  }
}

function processFile(p) {
  const orig = readFileSync(p, "utf8");
  let out = orig;
  out = out.replace(DARK_REGEX, "#111827");
  out = out.replace(LIGHT_REGEX, "#fffafc");
  for (const { re, repl } of RGBA_PATTERNS) {
    out = out.replace(re, repl);
  }
  // Replace linear/radial gradients that became flat #111827→#111827 with the solid color
  out = out.replace(/linear-gradient\([^()]*?#111827[^()]*?#111827[^()]*?\)/g, "#111827");
  if (out !== orig) {
    writeFileSync(p, out, "utf8");
    changed++;
    console.log("updated", p);
  }
}

walk(ROOT);
console.log(`\nDone. Files changed: ${changed}`);

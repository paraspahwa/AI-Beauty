"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Copy } from "lucide-react";
import type { ColorAnalysisResult } from "@/types/report";
import { staggerContainer, fadeUp, hoverScale } from "@/lib/animations";

export function ColorAnalysisCard({ data }: { data: ColorAnalysisResult }) {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const copyToClipboard = async (hex: string, name: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      setTimeout(() => setCopiedHex(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-ink-mist mb-2">
              Your Color Season
            </p>
            <CardTitle className="gradient-text text-3xl">{data.season}</CardTitle>
          </div>
          <Badge
            tone="accent"
            className="text-sm px-4 py-2 bg-terracotta/10 text-terracotta border-terracotta/20"
          >
            {data.undertone} undertone
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-ink-stone leading-relaxed"
        >
          {data.description}
        </motion.p>

        {/* Color Palette Grid */}
        <section>
          <h4 className="mb-4 text-xs uppercase tracking-widest text-ink-mist flex items-center gap-2">
            <span className="h-px flex-1 bg-gradient-to-r from-terracotta/30 to-transparent" />
            Your Perfect Palette
            <span className="h-px flex-1 bg-gradient-to-l from-terracotta/30 to-transparent" />
          </h4>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-4 gap-4 sm:grid-cols-6 md:grid-cols-8"
          >
            {data.palette.map((color, index) => (
              <motion.div
                key={color.hex}
                variants={fadeUp}
                className="flex flex-col items-center gap-2 group"
              >
                <motion.button
                  whileHover="hover"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => copyToClipboard(color.hex, color.name)}
                  className="relative cursor-pointer focus-ring rounded-full"
                  aria-label={`Copy ${color.name} color ${color.hex}`}
                >
                  <motion.div
                    variants={hoverScale}
                    className="h-14 w-14 sm:h-16 sm:w-16 rounded-full border-2 border-white shadow-card relative overflow-hidden"
                    style={{ backgroundColor: color.hex }}
                  >
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      {copiedHex === color.hex ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="rounded-full p-1.5" style={{ background: "#0A0A0F" }}
                        >
                          <Check className="h-4 w-4 text-sage" />
                        </motion.div>
                      ) : (
                        <Copy className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </motion.div>

                  {/* Tooltip on hover */}
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    whileHover={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-16 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    {color.hex}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-ink rotate-45" />
                  </motion.div>
                </motion.button>

                <span className="text-[10px] sm:text-xs text-ink-stone text-center leading-tight max-w-[4rem]">
                  {color.name}
                </span>
              </motion.div>
            ))}
          </motion.div>

          <p className="mt-4 text-center text-xs text-ink-mist italic">
            Click any color to copy its hex code
          </p>
        </section>

        {/* Two-Column Comparison */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Wear These */}
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl bg-sage/5 border-l-4 border-sage p-6"
          >
            <h4 className="mb-4 text-sm font-medium text-sage flex items-center gap-2">
              <Check className="h-5 w-5" />
              Wear These Colors
            </h4>
            <div className="space-y-3">
              {data.palette.slice(0, 4).map((color) => (
                <div key={color.hex} className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-full border border-white shadow-sm shrink-0"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">{color.name}</p>
                    <p className="text-xs text-ink-stone">Enhances your natural coloring</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Avoid These */}
          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl bg-terracotta/5 border-l-4 border-terracotta/40 p-6"
          >
            <h4 className="mb-4 text-sm font-medium text-terracotta flex items-center gap-2">
              <span className="text-lg">✕</span>
              Avoid These Colors
            </h4>
            <div className="space-y-3">
              {data.avoidColors.map((color) => (
                <div key={color.hex} className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-full border border-white shadow-sm shrink-0"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">{color.name}</p>
                    <p className="text-xs text-ink-stone">Can wash you out</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        </div>

        {/* Mini Cards Row */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Best Metals */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl bg-gradient-to-br from-camel/10 to-terracotta/10 p-5 border border-cream-200"
          >
            <h4 className="mb-3 text-xs uppercase tracking-widest text-terracotta font-medium">
              Best Metals
            </h4>
            <div className="flex flex-wrap gap-2">
              {data.metals.map((metal) => (
                <Badge
                  key={metal}
                  tone="default"
                  className="text-ink-stone" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {metal}
                </Badge>
              ))}
            </div>
          </motion.div>

          {/* Makeup Colors */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl bg-gradient-to-br from-sage/10 to-olive/10 p-5 border border-cream-200"
          >
            <h4 className="mb-3 text-xs uppercase tracking-widest text-olive font-medium">
              Makeup Tones
            </h4>
            <div className="flex gap-2">
              {data.palette.slice(0, 3).map((color) => (
                <div
                  key={color.hex}
                  className="h-8 w-8 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-stone">Warm, muted tones</p>
          </motion.div>

          {/* Best Prints */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl bg-gradient-to-br from-olive/10 to-sage/10 p-5 border border-cream-200"
          >
            <h4 className="mb-3 text-xs uppercase tracking-widest text-sage font-medium">
              Best Prints
            </h4>
            <ul className="space-y-1 text-xs text-ink-stone">
              <li>• Soft florals</li>
              <li>• Muted patterns</li>
              <li>• Earthy plaids</li>
            </ul>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}

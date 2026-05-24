import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1280px" } },
    extend: {
      colors: {
        // Neutral background tier (matches mobile #fffafc)
        obsidian: {
          DEFAULT: "#fffafc",
          50: "#ffffff",
          100: "#fffafc",
          200: "#f9fafb",
          300: "#f3f4f6",
        },
        // Primary ink (matches mobile #111827 / gray-900)
        chrome: {
          DEFAULT: "#111827",
          gold: "#e5e7eb",
          rose: "#374151",
          silver: "#111827",
          platinum: "#fffafc",
        },
        // Neutral accent (mobile uses gray-700 for secondary surfaces)
        iris: {
          DEFAULT: "#374151",
          light: "#9ca3af",
          dark: "#111827",
        },
        // Legacy aliases — neutralised to mobile palette
        ink: {
          DEFAULT: "#111827",
          stone: "#374151",
          mist: "#6b7280",
        },
        cream: {
          DEFAULT: "#fffafc",
          50: "#ffffff",
          100: "#fffafc",
          200: "#f9fafb",
          300: "#f3f4f6",
        },
        terracotta: {
          DEFAULT: "#111827",
          light: "#e5e7eb",
          dark: "#111827",
        },
        olive: {
          DEFAULT: "#374151",
          light: "#9ca3af",
          dark: "#111827",
        },
        camel: {
          DEFAULT: "#e5e7eb",
          light: "#f3f4f6",
          dark: "#d1d5db",
        },
        sage: {
          DEFAULT: "#111827",
          light: "#6b7280",
          dark: "#111827",
        },
        accent: {
          DEFAULT: "#111827",
          soft: "#9ca3af",
          deep: "#111827",
        },
        success: "#16A34A",
        danger: "#b91c1c",
      },
      fontFamily: {
        serif: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.05)",
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        premium: "0 4px 12px rgba(0,0,0,0.08)",
        glow: "0 4px 12px rgba(17,24,39,0.08)",
        "glow-iris": "0 4px 12px rgba(17,24,39,0.08)",
        chrome: "0 1px 0 rgba(255,255,255,0.6) inset, 0 1px 2px rgba(0,0,0,0.06)",
      },
      backgroundImage: {
        "chrome-gradient": "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
        "dark-surface": "linear-gradient(145deg, #ffffff 0%, #f9fafb 100%)",
        "metal-sheen": "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "chrome-scan": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(201,149,107,0.2)" },
          "50%": { boxShadow: "0 0 60px rgba(201,149,107,0.5)" },
        },
        // ── New ────────────────────────────────────────────────────────────────
        aurora: {
          "0%":   { backgroundPosition: "0% 50%",   filter: "hue-rotate(0deg)" },
          "33%":  { backgroundPosition: "50% 100%",  filter: "hue-rotate(20deg)" },
          "66%":  { backgroundPosition: "100% 50%",  filter: "hue-rotate(-15deg)" },
          "100%": { backgroundPosition: "0% 50%",   filter: "hue-rotate(0deg)" },
        },
        "beam-sweep": {
          "0%":   { transform: "translateX(-100%) skewX(-15deg)", opacity: "0" },
          "10%":  { opacity: "1" },
          "90%":  { opacity: "1" },
          "100%": { transform: "translateX(200%) skewX(-15deg)", opacity: "0" },
        },
        "glow-breathe": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%":       { opacity: "0.8", transform: "scale(1.08)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "33%":       { transform: "translateY(-14px) rotate(1deg)" },
          "66%":       { transform: "translateY(-6px) rotate(-1deg)" },
        },
        "ring-spin": {
          "0%":   { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "text-reveal": {
          "0%":   { clipPath: "inset(0 100% 0 0)", opacity: "0" },
          "100%": { clipPath: "inset(0 0% 0 0)",   opacity: "1" },
        },
        "grain": {
          "0%, 100%": { transform: "translate(0,0)" },
          "10%": { transform: "translate(-1%,-2%)" },
          "20%": { transform: "translate(2%,1%)" },
          "30%": { transform: "translate(-1%,3%)" },
          "40%": { transform: "translate(2%,-1%)" },
          "50%": { transform: "translate(-2%,2%)" },
          "60%": { transform: "translate(3%,-2%)" },
          "70%": { transform: "translate(-1%,1%)" },
          "80%": { transform: "translate(1%,3%)" },
          "90%": { transform: "translate(-2%,-1%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        shimmer: "shimmer 3s ease-in-out infinite",
        "chrome-scan": "chrome-scan 4s ease infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 6s ease-in-out infinite",
        "float-slow": "float-slow 9s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        aurora: "aurora 12s ease infinite",
        "beam-sweep": "beam-sweep 3.5s ease-in-out infinite",
        "glow-breathe": "glow-breathe 4s ease-in-out infinite",
        "ring-spin": "ring-spin 8s linear infinite",
        "text-reveal": "text-reveal 0.8s cubic-bezier(0.22,1,0.36,1) forwards",
        grain: "grain 0.4s steps(1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

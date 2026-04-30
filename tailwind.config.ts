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
        // Obsidian dark base
        obsidian: {
          DEFAULT: "#0A0A0F",
          50: "#12121A",
          100: "#1A1A26",
          200: "#242433",
          300: "#2E2E44",
        },
        // Rose-gold metallic accent
        chrome: {
          DEFAULT: "#C9956B",
          gold: "#E8C990",
          rose: "#D4857A",
          silver: "#B8C4CC",
          platinum: "#E8EDF0",
        },
        // Deep iris / violet secondary
        iris: {
          DEFAULT: "#7B6E9E",
          light: "#A69CC4",
          dark: "#5A5075",
        },
        // Legacy aliases — keeps all existing components working
        ink: {
          DEFAULT: "#F0E8D8",
          stone: "#B8AE9C",
          mist: "#5A5068",
        },
        cream: {
          DEFAULT: "#0A0A0F",
          50: "#12121A",
          100: "#1A1A26",
          200: "#242433",
          300: "#2E2E44",
        },
        terracotta: {
          DEFAULT: "#C9956B",
          light: "#E8C990",
          dark: "#A87050",
        },
        olive: {
          DEFAULT: "#7B6E9E",
          light: "#A69CC4",
          dark: "#5A5075",
        },
        camel: {
          DEFAULT: "#E8C990",
          light: "#F0DDB0",
          dark: "#C9A860",
        },
        sage: {
          DEFAULT: "#B8C4CC",
          light: "#D4DEE4",
          dark: "#8A9AA4",
        },
        accent: {
          DEFAULT: "#C9956B",
          soft: "#E8C990",
          deep: "#A87050",
        },
        success: "#7B6E9E",
        danger: "#D4857A",
      },
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        soft: "0 8px 24px rgba(0,0,0,0.5)",
        card: "0 4px 16px rgba(0,0,0,0.4)",
        premium: "0 12px 48px rgba(0,0,0,0.7)",
        glow: "0 0 40px rgba(201,149,107,0.3)",
        "glow-iris": "0 0 40px rgba(123,110,158,0.3)",
        chrome: "0 1px 0 rgba(255,255,255,0.12) inset, 0 8px 32px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "chrome-gradient": "linear-gradient(135deg, #C9956B 0%, #E8C990 40%, #D4857A 70%, #B8C4CC 100%)",
        "dark-surface": "linear-gradient(145deg, #12121A 0%, #1A1A26 100%)",
        "metal-sheen": "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.07) 50%, transparent 60%)",
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
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        shimmer: "shimmer 3s ease-in-out infinite",
        "chrome-scan": "chrome-scan 4s ease infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 6s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

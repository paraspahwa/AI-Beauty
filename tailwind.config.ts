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
        // Warm cream background
        cream: {
          DEFAULT: "#FAF7F2",
          50: "#FCFAF6",
          100: "#FAF7F2",
          200: "#F2ECE0",
          300: "#E8DEC9",
        },
        // Text colors
        ink: {
          DEFAULT: "#1A1A1A",
          stone: "#4A4A4A",
          mist: "#8A8A8A",
        },
        // Soft Autumn color palette
        terracotta: {
          DEFAULT: "#C17A5F",
          light: "#D9A08A",
          dark: "#A85E47",
        },
        olive: {
          DEFAULT: "#7A8450",
          light: "#9CAF88",
          dark: "#5C6337",
        },
        camel: {
          DEFAULT: "#C4A882",
          light: "#D9C8A8",
          dark: "#A88B63",
        },
        sage: {
          DEFAULT: "#9CAF88",
          light: "#B8C9A8",
          dark: "#7A8F68",
        },
        // Legacy aliases for compatibility
        accent: {
          DEFAULT: "#C17A5F", // terracotta
          soft: "#D9A08A",
          deep: "#A85E47",
        },
        success: "#7A8450",
        danger: "#C17A5F",
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
        soft: "0 8px 24px rgba(26, 26, 26, 0.08)",
        card: "0 4px 16px rgba(26, 26, 26, 0.06)",
        premium: "0 12px 40px rgba(26, 26, 26, 0.12)",
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
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        shimmer: "shimmer 3s ease-in-out infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

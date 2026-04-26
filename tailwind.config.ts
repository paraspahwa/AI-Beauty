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
        cream: {
          DEFAULT: "#FAF7F2",
          50: "#FCFAF6",
          100: "#FAF7F2",
          200: "#F2ECE0",
          300: "#E8DEC9",
        },
        ink: {
          DEFAULT: "#2A1F14",
          soft: "#5C4A35",
          muted: "#8A7457",
        },
        accent: {
          DEFAULT: "#B6896B",
          soft: "#D9B89A",
          deep: "#7A5234",
        },
        success: "#5C8B5A",
        danger: "#B85C4F",
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 4px 24px -8px rgba(122, 82, 52, 0.12)",
        card: "0 2px 16px -4px rgba(122, 82, 52, 0.08)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

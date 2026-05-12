/**
 * Reusable animation variants for Framer Motion
 * Provides consistent animation patterns across the app
 */
import type { Variants } from "framer-motion";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export const slideIn = (direction: "left" | "right" | "up" | "down" = "left"): Variants => {
  const isX = direction === "left" || direction === "right";
  const distance = direction === "left" || direction === "up" ? -30 : 30;

  if (isX) {
    return {
      hidden: { opacity: 0, x: distance },
      visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.3, ease: "easeOut" as const },
      },
    };
  }
  return {
    hidden: { opacity: 0, y: distance },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" as const },
    },
  };
};

export const hoverLift = {
  scale: 1.02,
  y: -4,
  transition: {
    duration: 0.3,
    ease: "easeOut" as const,
  },
};

export const hoverScale = {
  hover: {
    scale: 1.1,
    transition: {
      duration: 0.2,
      ease: "easeOut" as const,
    },
  },
};

export const tapScale = {
  scale: 0.95,
  transition: {
    duration: 0.1,
    ease: "easeOut" as const,
  },
};

export const progressBar = {
  initial: { scaleX: 0 },
  animate: {
    scaleX: 1,
    transition: {
      duration: 0.5,
      ease: "easeInOut" as const,
    },
  },
};

export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: {
      duration: 0.2,
      ease: "easeIn" as const,
    },
  },
};

export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.2,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

export const pageTransition = {
  initial: { opacity: 0, x: -20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: 0.2,
      ease: "easeIn" as const,
    },
  },
};

export const tabContent: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
  exit: {
    opacity: 0,
    x: 10,
    transition: {
      duration: 0.2,
      ease: "easeIn" as const,
    },
  },
};

// ── New enhanced variants ───────────────────────────────────────────────────

/** Blur + fade + rise — use for hero headings */
export const blurIn: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(12px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

/** Spring-pop — bouncy entry for icons, badges, avatars */
export const springPop: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 380,
      damping: 20,
    },
  },
};

/** Floating card — combines enter + perpetual subtle float */
export const floatCard: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

/** Glow entrance — scales up with a glow shadow */
export const glowIn: Variants = {
  hidden: { opacity: 0, scale: 0.9, filter: "brightness(0.5)" },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "brightness(1)",
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

/** Cascade stagger — tighter children delay for lists */
export const cascadeContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

/** Slide in from bottom with spring — for modals, toasts */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 48 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 340,
      damping: 28,
    },
  },
  exit: {
    opacity: 0,
    y: 32,
    transition: { duration: 0.2, ease: "easeIn" as const },
  },
};


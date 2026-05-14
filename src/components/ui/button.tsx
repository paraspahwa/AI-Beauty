"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian disabled:opacity-40 disabled:pointer-events-none cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-terracotta text-white hover:opacity-90 hover:-translate-y-px shadow-card",
        accent: [
          "text-white shadow-glow-iris",
          "bg-[linear-gradient(135deg,#8B5CF6_0%,#A78BFA_100%)]",
          "hover:opacity-95 hover:-translate-y-px",
        ].join(" "),
        outline: "border border-terracotta/40 text-terracotta bg-white/60 hover:bg-terracotta/10",
        ghost: "text-ink hover:bg-terracotta/10",
      },
      size: {
        sm: "h-9  px-4 text-sm",
        md: "h-11 px-6 text-sm",
        lg: "h-12 px-8 text-base",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  },
);
Button.displayName = "Button";

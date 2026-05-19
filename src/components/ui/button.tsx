"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian disabled:opacity-40 disabled:pointer-events-none cursor-pointer active:scale-[0.985]",
  {
    variants: {
      variant: {
        default: [
          "text-white shadow-chrome",
          "bg-[linear-gradient(135deg,#DB2777_0%,#EC4899_55%,#F97316_100%)]",
          "hover:opacity-95 hover:-translate-y-px",
        ].join(" "),
        accent: [
          "text-white shadow-glow-iris",
          "bg-[linear-gradient(135deg,#0EA5A4_0%,#14B8A6_55%,#22D3EE_100%)]",
          "hover:opacity-95 hover:-translate-y-px",
        ].join(" "),
        outline: "border border-terracotta/35 text-terracotta bg-white/75 hover:bg-terracotta/10 hover:border-terracotta/55",
        ghost: "text-ink hover:bg-terracotta/10 hover:text-terracotta-dark",
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

"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chrome focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian disabled:opacity-40 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-obsidian-100 text-ink hover:bg-obsidian-200 border border-white/8 shadow-card",
        accent: [
          "text-obsidian font-semibold shadow-glow",
          "bg-[linear-gradient(135deg,#C9956B_0%,#E8C990_40%,#D4857A_70%,#B8C4CC_100%)]",
          "bg-[length:200%_200%] hover:shadow-[0_0_60px_rgba(201,149,107,0.55)]",
          "hover:brightness-110",
        ].join(" "),
        outline: "border border-white/10 text-ink hover:bg-white/5 hover:border-chrome/40 transition-colors",
        ghost: "text-ink hover:bg-white/5",
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

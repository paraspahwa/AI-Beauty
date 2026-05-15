"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StickyMobileCta() {
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const pricing = document.getElementById("pricing");
    if (!pricing) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHidden(entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(pricing);
    return () => observer.disconnect();
  }, []);

  if (!mounted) return null;

  return (
    <motion.div
      className="fixed bottom-0 inset-x-0 z-50 sm:hidden border-t border-terracotta/20 bg-white/90 backdrop-blur-md p-3"
      initial={{ y: 80 }}
      animate={{ y: hidden ? 80 : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <Button asChild size="lg" variant="accent" className="w-full cta-shimmer">
        <Link href="/upload" className="flex items-center justify-center gap-2">
          <Camera className="h-4 w-4" />
          Start free analysis
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </motion.div>
  );
}

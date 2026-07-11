"use client";

import { useEffect } from "react";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DiscoveryCompassProps {
  nudgeKey: number;
  needleAngle?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function DiscoveryCompass({ nudgeKey, needleAngle = 0, size = "md", className }: DiscoveryCompassProps) {
  const controls = useAnimationControls();
  const reduceMotion = useReducedMotion();

  const dim = size === "lg" ? "h-28 w-28" : size === "sm" ? "h-16 w-16" : "h-20 w-20";

  useEffect(() => {
    if (reduceMotion) return;
    void controls.start({
      rotate: [needleAngle, needleAngle + 12, needleAngle - 6, needleAngle],
      transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
    });
  }, [nudgeKey, controls, reduceMotion, needleAngle]);

  return (
    <div className={cn("relative mx-auto", dim, className)} aria-hidden>
      <div className="absolute inset-0 rounded-full border border-primary/20 bg-white/[0.03] shadow-[0_0_30px_-10px_var(--glow)] backdrop-blur-xl" />
      <motion.div className="absolute inset-[10%]" animate={controls} style={{ transformOrigin: "50% 50%" }}>
        <svg viewBox="0 0 80 80" className="h-full w-full" fill="none">
          <circle cx="40" cy="40" r="34" stroke="rgba(45,212,191,0.2)" strokeWidth="1" strokeDasharray="3 5" />
          <path d="M40 8 L46 40 L40 36 L34 40 Z" fill="rgb(45 212 191)" opacity="0.95" />
          <path d="M40 72 L46 40 L40 44 L34 40 Z" fill="rgba(255,255,255,0.1)" />
          <circle cx="40" cy="40" r="5" fill="#06080d" stroke="rgb(45 212 191)" strokeWidth="2" />
        </svg>
      </motion.div>
    </div>
  );
}

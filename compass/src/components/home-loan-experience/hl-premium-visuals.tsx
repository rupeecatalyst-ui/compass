"use client";

import { motion, useReducedMotion } from "framer-motion";
import { parallaxStyle, useMouseParallax } from "@/components/home-loan-experience/hl-utils";
import { cn } from "@/lib/utils";

/** Layered premium home silhouette with soft lighting. */
export function PremiumHomeVisual({ className }: { className?: string }) {
  const offset = useMouseParallax(24);
  const reduceMotion = useReducedMotion();

  return (
    <div className={cn("relative aspect-[4/3] w-full max-w-2xl", className)} aria-hidden>
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(ellipse_80%_60%_at_50%_80%,rgba(45,212,191,0.12),transparent_70%)]"
        style={reduceMotion ? undefined : parallaxStyle(offset, -8)}
      />

      {/* Sky gradient */}
      <div
        className="absolute inset-0 overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#0c1420] via-[#0a1018] to-[#06080d]"
        style={reduceMotion ? undefined : parallaxStyle(offset, -4)}
      >
        {/* Stars / subtle light */}
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.06),transparent_40%),radial-gradient(circle_at_70%_15%,rgba(45,212,191,0.08),transparent_35%)]" />

        {/* Moon / soft light source */}
        <div
          className="absolute right-[18%] top-[12%] h-16 w-16 rounded-full bg-[radial-gradient(circle,rgba(255,248,235,0.15),transparent_70%)] blur-sm sm:h-20 sm:w-20"
          style={reduceMotion ? undefined : parallaxStyle(offset, 6)}
        />

        {/* Home structure */}
        <svg
          viewBox="0 0 400 300"
          className="absolute bottom-0 left-1/2 w-[88%] -translate-x-1/2"
          style={reduceMotion ? undefined : parallaxStyle(offset, 12)}
          fill="none"
        >
          <defs>
            <linearGradient id="hl_roof" x1="200" y1="60" x2="200" y2="140" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1e293b" />
              <stop offset="1" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="hl_wall" x1="200" y1="140" x2="200" y2="260" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1a2332" />
              <stop offset="1" stopColor="#111827" />
            </linearGradient>
            <linearGradient id="hl_window" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="rgba(45,212,191,0.35)" />
              <stop offset="1" stopColor="rgba(45,212,191,0.08)" />
            </linearGradient>
          </defs>
          {/* Ground */}
          <ellipse cx="200" cy="278" rx="160" ry="12" fill="rgba(45,212,191,0.06)" />
          {/* Main house */}
          <path d="M120 150 L200 75 L280 150 Z" fill="url(#hl_roof)" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <rect x="130" y="148" width="140" height="115" rx="2" fill="url(#hl_wall)" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          {/* Windows with warm glow */}
          <rect x="155" y="175" width="35" height="40" rx="2" fill="url(#hl_window)" />
          <rect x="210" y="175" width="35" height="40" rx="2" fill="url(#hl_window)" />
          <rect x="175" y="225" width="50" height="38" rx="2" fill="rgba(45,212,191,0.12)" stroke="rgba(45,212,191,0.2)" strokeWidth="1" />
          {/* Porch light */}
          <circle cx="200" cy="168" r="4" fill="rgba(255,220,150,0.6)" className="animate-pulse" style={{ animationDuration: "4s" }} />
        </svg>

        {/* Foreground depth — subtle fence/plants */}
        <div
          className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#06080d] to-transparent"
          style={reduceMotion ? undefined : parallaxStyle(offset, 18)}
        />
      </div>

      {/* Glass reflection overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-tr from-white/[0.04] via-transparent to-transparent" />
    </div>
  );
}

/** Compass centrepiece for hero — subtle calibration. */
export function HeroCompass({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const offset = useMouseParallax(16);

  return (
    <motion.div
      className={cn("relative", className)}
      style={reduceMotion ? undefined : parallaxStyle(offset, 10)}
      initial={false}
      animate={reduceMotion ? undefined : { rotate: [0, -6, 4, 0] }}
      transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
    >
      <div className="relative mx-auto h-28 w-28 sm:h-36 sm:w-36">
        <div className="absolute inset-0 rounded-full border border-primary/20 bg-white/[0.03] shadow-[0_0_40px_-12px_var(--glow)] backdrop-blur-xl" />
        <div className="absolute inset-[6px] rounded-full border border-white/[0.06]" />
        <svg viewBox="0 0 148 148" className="absolute inset-[12px]" fill="none" aria-hidden>
          <circle cx="74" cy="74" r="58" stroke="rgba(45,212,191,0.2)" strokeWidth="1" strokeDasharray="3 5" />
          <path d="M74 18 L82 74 L74 66 L66 74 Z" fill="rgb(45 212 191)" opacity="0.95" />
          <path d="M74 130 L82 74 L74 82 L66 74 Z" fill="rgba(255,255,255,0.12)" />
          <circle cx="74" cy="74" r="8" fill="#06080d" stroke="rgb(45 212 191)" strokeWidth="2.5" />
        </svg>
      </div>
    </motion.div>
  );
}

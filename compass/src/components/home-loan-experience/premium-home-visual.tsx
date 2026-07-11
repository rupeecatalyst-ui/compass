"use client";

import { motion, useReducedMotion } from "framer-motion";
import { parallaxStyle, useMouseParallax } from "@/components/home-loan-experience/hl-utils";
import { cn } from "@/lib/utils";

/** Layered premium home silhouette with soft lighting. */
export function PremiumHomeVisual({ className }: { className?: string }) {
  const offset = useMouseParallax(24);
  const reduceMotion = useReducedMotion();

  const layers = reduceMotion ? { x: 0, y: 0 } : offset;

  return (
    <div className={cn("relative aspect-[4/3] w-full max-w-2xl", className)} aria-hidden>
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(ellipse_70%_60%_at_50%_40%,rgba(45,212,191,0.14),transparent_70%)]"
        style={reduceMotion ? undefined : parallaxStyle(layers, -8)}
      />

      {/* Sky gradient */}
      <div
        className="absolute inset-0 overflow-hidden rounded-[2rem] border border-white/[0.06] bg-gradient-to-b from-[#0c1420] via-[#0a1018] to-[#06080d]"
        style={reduceMotion ? undefined : parallaxStyle(layers, 4)}
      >
        {/* Moon / soft light */}
        <div
          className="absolute right-[18%] top-[12%] h-16 w-16 rounded-full bg-[radial-gradient(circle,rgba(255,248,235,0.35),transparent_70%)] blur-sm sm:h-20 sm:w-20"
          style={reduceMotion ? undefined : parallaxStyle(layers, -12)}
        />

        {/* Hills */}
        <svg
          className="absolute bottom-0 w-full"
          viewBox="0 0 400 120"
          preserveAspectRatio="none"
          style={reduceMotion ? undefined : parallaxStyle(layers, 8)}
        >
          <path
            d="M0 120 L0 80 Q100 40 200 70 T400 50 L400 120 Z"
            fill="rgba(20,30,45,0.9)"
          />
          <path
            d="M0 120 L0 95 Q150 60 280 85 T400 75 L400 120 Z"
            fill="rgba(15,22,35,0.95)"
          />
        </svg>

        {/* Home structure */}
        <div
          className="absolute bottom-[18%] left-1/2 w-[42%] -translate-x-1/2"
          style={reduceMotion ? undefined : parallaxStyle(layers, 14)}
        >
          <svg viewBox="0 0 200 180" className="w-full drop-shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
            <defs>
              <linearGradient id="hl_roof" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e3a4a" />
                <stop offset="100%" stopColor="#0f1c28" />
              </linearGradient>
              <linearGradient id="hl_wall" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
              </linearGradient>
              <linearGradient id="hl_window" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,220,150,0.45)" />
                <stop offset="100%" stopColor="rgba(255,180,80,0.15)" />
              </linearGradient>
            </defs>
            {/* Roof */}
            <polygon points="100,20 175,85 25,85" fill="url(#hl_roof)" stroke="rgba(45,212,191,0.2)" strokeWidth="1" />
            {/* Body */}
            <rect x="45" y="85" width="110" height="75" rx="2" fill="url(#hl_wall)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            {/* Windows — warm light */}
            <rect x="58" y="98" width="28" height="28" rx="2" fill="url(#hl_window)" />
            <rect x="114" y="98" width="28" height="28" rx="2" fill="url(#hl_window)" />
            {/* Door */}
            <rect x="88" y="118" width="24" height="42" rx="2" fill="rgba(15,25,35,0.9)" stroke="rgba(45,212,191,0.25)" strokeWidth="1" />
            {/* Door light spill */}
            <ellipse cx="100" cy="155" rx="18" ry="6" fill="rgba(255,200,120,0.12)" />
          </svg>
        </div>

        {/* Foreground mist */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#06080d] to-transparent" />
      </div>

      {/* Compass overlay */}
      <motion.div
        className="absolute -right-2 top-[8%] sm:right-0 sm:top-[5%]"
        style={reduceMotion ? undefined : parallaxStyle(layers, -18)}
        animate={reduceMotion ? undefined : { rotate: [0, 4, -2, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="relative h-24 w-24 rounded-full border border-primary/20 bg-black/30 p-3 backdrop-blur-xl sm:h-28 sm:w-28">
          <svg viewBox="0 0 100 100" className="h-full w-full" fill="none">
            <circle cx="50" cy="50" r="42" stroke="rgba(45,212,191,0.3)" strokeWidth="1" />
            <polygon points="50,18 56,50 50,44 44,50" fill="#2dd4bf" opacity="0.9" />
            <polygon points="50,82 56,50 50,56 44,50" fill="rgba(45,212,191,0.25)" />
            <circle cx="50" cy="50" r="5" fill="#06080d" stroke="#2dd4bf" strokeWidth="2" />
          </svg>
        </div>
      </motion.div>
    </div>
  );
}

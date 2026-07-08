"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Subtle vector / semi-3D illustration backdrop for Personal Loan.
 * Intentionally abstract (no stock-photo feel), low opacity, premium.
 */
export function PersonalLoanIllustration({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={cn("relative mx-auto w-full max-w-[520px] opacity-[0.16]", className)}
      aria-hidden
    >
      <motion.svg
        viewBox="0 0 640 420"
        className="h-full w-full"
        fill="none"
        initial={false}
        animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
        transition={reduceMotion ? undefined : { duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          <linearGradient id="pl_glow" x1="120" y1="60" x2="520" y2="360" gradientUnits="userSpaceOnUse">
            <stop stopColor="rgb(59 130 246)" stopOpacity="0.95" />
            <stop offset="1" stopColor="rgb(34 211 238)" stopOpacity="0.85" />
          </linearGradient>
          <radialGradient id="pl_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
            gradientTransform="translate(320 210) rotate(90) scale(200 260)">
            <stop stopColor="rgb(59 130 246)" stopOpacity="0.35" />
            <stop offset="1" stopColor="rgb(59 130 246)" stopOpacity="0" />
          </radialGradient>
          <filter id="pl_blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>

        {/* Soft lighting */}
        <ellipse cx="320" cy="210" rx="240" ry="170" fill="url(#pl_radial)" filter="url(#pl_blur)" />

        {/* Abstract “young professional” silhouette + goal bubble (travel/education vibe) */}
        <path
          d="M250 260 C250 220 276 192 320 192 C364 192 390 220 390 260 C390 306 360 342 320 342 C280 342 250 306 250 260 Z"
          fill="rgba(255,255,255,0.06)"
          stroke="rgba(255,255,255,0.10)"
        />
        <path
          d="M300 162 C300 142 312 130 330 130 C348 130 360 142 360 162 C360 182 348 194 330 194 C312 194 300 182 300 162 Z"
          fill="rgba(255,255,255,0.07)"
          stroke="rgba(255,255,255,0.12)"
        />

        {/* Goal bubble */}
        <path
          d="M430 118 C430 88 458 66 498 66 C538 66 566 88 566 118 C566 148 538 170 498 170 C484 170 471 167 460 162 L438 174 L444 154 C435 145 430 132 430 118 Z"
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.10)"
        />
        <path
          d="M474 122 l12 -18 h24 l-10 14 h18 l-30 36 -10 -16 h-18 z"
          fill="url(#pl_glow)"
          opacity="0.85"
        />

        {/* Motion micro-elements */}
        <motion.circle
          cx="170"
          cy="140"
          r="6"
          fill="url(#pl_glow)"
          opacity="0.55"
          animate={reduceMotion ? undefined : { opacity: [0.25, 0.55, 0.25] }}
          transition={reduceMotion ? undefined : { duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.circle
          cx="520"
          cy="282"
          r="7"
          fill="url(#pl_glow)"
          opacity="0.45"
          animate={reduceMotion ? undefined : { opacity: [0.18, 0.5, 0.18] }}
          transition={reduceMotion ? undefined : { duration: 5.1, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Outline accents */}
        <path
          d="M96 310 C190 250, 230 230, 280 214"
          stroke="url(#pl_glow)"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          strokeDasharray="6 7"
        />
        <path
          d="M362 318 C420 290, 470 260, 540 220"
          stroke="url(#pl_glow)"
          strokeOpacity="0.25"
          strokeWidth="1.5"
          strokeDasharray="6 7"
        />
      </motion.svg>
    </div>
  );
}


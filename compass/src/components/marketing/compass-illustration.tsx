"use client";

import { motion } from "framer-motion";

export function CompassIllustration() {
  return (
    <div className="relative mx-auto flex aspect-square w-full max-w-md items-center justify-center" aria-hidden>
      <motion.div
        className="absolute inset-8 rounded-full border border-primary/10 bg-primary/[0.03]"
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <svg viewBox="0 0 320 320" className="relative h-full w-full" fill="none">
        <circle cx="160" cy="160" r="130" stroke="currentColor" strokeWidth="1.5" className="text-border" />
        <circle cx="160" cy="160" r="100" stroke="currentColor" strokeWidth="1" className="text-primary/20" strokeDasharray="4 6" />
        <motion.g
          style={{ originX: "160px", originY: "160px" }}
          animate={{ rotate: [0, 8, -4, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        >
          <polygon points="160,70 175,160 160,145 145,160" className="fill-primary" />
          <polygon points="160,250 175,160 160,175 145,160" className="fill-primary/25" />
        </motion.g>
        <circle cx="160" cy="160" r="12" className="fill-background stroke-primary" strokeWidth="3" />
      </svg>
    </div>
  );
}

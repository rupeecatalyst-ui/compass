"use client";

import { useEffect, useState } from "react";
import { motion, useAnimationControls, useReducedMotion, useInView } from "framer-motion";
import { useRef } from "react";
import { HlBody, HlChapter, HlEyebrow, HlGlassCard, HlHeadline } from "@/components/home-loan-experience/hl-chapter";
import { homeLoanExperience } from "@/config/home-loan-experience";
import { smoothEase } from "@/lib/animations";
import { cn } from "@/lib/utils";

function MatchCard({
  tier,
  lender,
  rate,
  why,
  emphasis,
  delay,
}: {
  tier: string;
  lender: string;
  rate: string;
  why: string;
  emphasis: "primary" | "accent" | "default";
  delay: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay, ease: smoothEase }}
      className={cn(
        "rounded-2xl border p-5 backdrop-blur-xl sm:p-6",
        emphasis === "primary" && "border-primary/35 bg-primary/[0.08] shadow-[0_0_48px_-16px_var(--glow)]",
        emphasis === "accent" && "border-accent/25 bg-accent/[0.05]",
        emphasis === "default" && "border-white/[0.08] bg-white/[0.03]",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">{tier}</p>
      <p className="mt-3 text-xl font-semibold tracking-tight">{lender}</p>
      <p className="mt-1 text-sm text-muted-foreground">from {rate}</p>
      <p className="mt-4 text-sm leading-relaxed text-foreground/85">{why}</p>
    </motion.div>
  );
}

export function HlBestMatch() {
  const { bestMatch } = homeLoanExperience;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const needleControls = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!inView || reduceMotion) {
      setRevealed(true);
      return;
    }
    void needleControls.start({
      rotate: [0, -15, 45, 30],
      transition: { duration: 1.4, ease: smoothEase },
    });
    const timer = window.setTimeout(() => setRevealed(true), 600);
    return () => window.clearTimeout(timer);
  }, [inView, needleControls, reduceMotion]);

  return (
    <HlChapter id="best-match" dark className="border-t border-white/[0.04]">
      <div className="mb-14 text-center">
        <HlEyebrow className="text-center">{bestMatch.eyebrow}</HlEyebrow>
        <HlHeadline className="mx-auto max-w-2xl">{bestMatch.headline}</HlHeadline>
        <HlBody className="mx-auto mt-4 max-w-lg">{bestMatch.subheadline}</HlBody>
      </div>

      <div ref={ref} className="relative">
        {/* Compass centrepiece */}
        <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2">
          <HlGlassCard className="!p-4">
            <motion.div
              className="relative h-20 w-20"
              animate={needleControls}
              style={{ transformOrigin: "50% 50%" }}
            >
              <svg viewBox="0 0 80 80" className="h-full w-full" fill="none" aria-hidden>
                <circle cx="40" cy="40" r="36" stroke="rgba(45,212,191,0.25)" strokeWidth="1" />
                <path d="M40 8 L46 40 L40 36 L34 40 Z" fill="rgb(45 212 191)" />
                <path d="M40 72 L46 40 L40 44 L34 40 Z" fill="rgba(255,255,255,0.1)" />
                <circle cx="40" cy="40" r="5" fill="#06080d" stroke="rgb(45 212 191)" strokeWidth="2" />
              </svg>
            </motion.div>
          </HlGlassCard>
        </div>

        <div className="grid gap-4 pt-16 sm:grid-cols-3 sm:gap-5 sm:pt-20">
          {revealed
            ? bestMatch.matches.map((match, i) => (
                <MatchCard key={match.id} {...match} delay={i * 0.12} />
              ))
            : bestMatch.matches.map((match) => (
                <div
                  key={match.id}
                  className="h-48 rounded-2xl border border-white/[0.04] bg-white/[0.01] sm:h-52"
                  aria-hidden
                />
              ))}
        </div>
      </div>
    </HlChapter>
  );
}

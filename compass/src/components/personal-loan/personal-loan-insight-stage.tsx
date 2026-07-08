"use client";

import { useEffect } from "react";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { FloatingInsightCard } from "@/components/homepage/floating-insight-card";
import { CompassIllustration } from "@/components/marketing/compass-illustration";
import { PersonalLoanIllustration } from "@/components/marketing/personal-loan-illustration";
import { personalLoanFloatingCards } from "@/config/personal-loan-floating-cards";
import { cn } from "@/lib/utils";

export function PersonalLoanInsightStage({ className }: { className?: string }) {
  const [instant, wallet, fastTrack] = personalLoanFloatingCards;
  const reduceMotion = useReducedMotion();
  const needleControls = useAnimationControls();

  useEffect(() => {
    if (reduceMotion) return;
    // Gentle calibration on load (1.6–1.9s), no dramatic spin.
    void needleControls.start({
      rotate: [0, -10, 8, -4, 0],
      transition: { duration: 1.75, ease: [0.22, 1, 0.36, 1] },
    });
  }, [needleControls, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    const onNavigate = () => {
      // Point “towards” the conversation (downwards), then settle naturally.
      void needleControls.start({
        rotate: [0, 105, 96],
        transition: { duration: 1.15, ease: [0.22, 1, 0.36, 1] },
      });
    };
    window.addEventListener("compass:navigate", onNavigate as EventListener);
    return () => window.removeEventListener("compass:navigate", onNavigate as EventListener);
  }, [needleControls, reduceMotion]);

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative mx-auto hidden min-h-[480px] w-full max-w-lg lg:block xl:min-h-[520px]">
        {/* Premium blue glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[74%] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.16),transparent_68%)]" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.10),transparent_70%)]" />

        {/* Subtle illustration backdrop (kept very light) */}
        <div className="pointer-events-none absolute left-1/2 top-[44%] w-[92%] -translate-x-1/2 -translate-y-1/2">
          <PersonalLoanIllustration className="opacity-[0.12]" />
        </div>

        {/* Badges (different positions vs Home Loan) */}
        <div className="absolute right-[14%] top-3 z-30">
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary shadow-[0_0_22px_-10px_var(--glow)]">
            AI Powered
          </span>
        </div>
        <div className="absolute left-8 top-20 z-30">
          <span className="rounded-full border border-accent/35 bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
            Limited Period Offer
          </span>
        </div>

        {/* Compass anchor (metallic glass) */}
        <div className="pointer-events-none absolute left-1/2 top-[46%] z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="relative h-[252px] w-[252px]">
            <div className="absolute inset-0 rounded-full border border-primary/25 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_24px_70px_-30px_rgba(0,0,0,0.85),0_0_40px_-16px_var(--glow)] backdrop-blur-2xl" />
            <div className="absolute inset-[10px] rounded-full border border-white/[0.08] bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.10),transparent_55%)]" />
            <div className="absolute inset-[18px] rounded-full border border-primary/15 bg-[radial-gradient(circle_at_60%_70%,rgba(34,211,238,0.10),transparent_55%)]" />

            {/* Base compass */}
            <div className="absolute inset-[34px] text-primary/90">
              <CompassIllustration className="max-w-none" />
            </div>

            {/* Needle overlay (CSS transform only via motion) */}
            <motion.div
              className="absolute left-1/2 top-1/2 h-[148px] w-[148px] -translate-x-1/2 -translate-y-1/2"
              style={{ transformOrigin: "50% 50%" }}
              initial={false}
              animate={needleControls}
            >
              <svg viewBox="0 0 148 148" className="h-full w-full" fill="none" aria-hidden>
                <defs>
                  <linearGradient id="pl_needle" x1="40" y1="18" x2="108" y2="130" gradientUnits="userSpaceOnUse">
                    <stop stopColor="rgb(34 211 238)" stopOpacity="0.9" />
                    <stop offset="1" stopColor="rgb(59 130 246)" stopOpacity="0.9" />
                  </linearGradient>
                </defs>
                <path
                  d="M74 14 L84 74 L74 66 L64 74 Z"
                  fill="url(#pl_needle)"
                  opacity="0.95"
                />
                <path d="M74 134 L84 74 L74 82 L64 74 Z" fill="rgba(255,255,255,0.10)" />
                <circle cx="74" cy="74" r="10" fill="rgba(6,8,13,0.7)" stroke="rgba(59,130,246,0.55)" strokeWidth="3" />
              </svg>
            </motion.div>
          </div>
        </div>

        {/* Cards arranged around compass (supporting, not competing) */}
        <div className="absolute left-0 top-6 z-20 w-[58%] max-w-[250px]">
          <FloatingInsightCard {...instant} />
        </div>
        <div className="absolute right-0 top-[22%] z-20 w-[50%] max-w-[215px]">
          <FloatingInsightCard {...wallet} />
        </div>
        <div className="absolute bottom-0 left-[10%] z-20 w-[64%] max-w-[270px]">
          <FloatingInsightCard {...fastTrack} />
        </div>
      </div>

      {/* Tablet */}
      <div className="hidden md:block lg:hidden">
        <div className="mx-auto mb-6 max-w-[420px]">
          <PersonalLoanIllustration className="opacity-[0.18]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <FloatingInsightCard {...instant} />
          </div>
          <FloatingInsightCard {...wallet} />
          <FloatingInsightCard {...fastTrack} />
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <div className="mx-auto mb-5 max-w-[360px]">
          <PersonalLoanIllustration className="opacity-[0.18]" />
        </div>
        <div className="space-y-3">
          <FloatingInsightCard {...instant} />
          <FloatingInsightCard {...wallet} />
          <FloatingInsightCard {...fastTrack} />
        </div>
      </div>
    </div>
  );
}


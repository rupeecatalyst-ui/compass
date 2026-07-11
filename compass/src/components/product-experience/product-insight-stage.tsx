"use client";

import { useEffect } from "react";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { FloatingInsightCard } from "@/components/homepage/floating-insight-card";
import type { FloatingInsightCardProps } from "@/components/homepage/floating-insight-card";
import { CompassIllustration } from "@/components/marketing/compass-illustration";
import { getProductMood, type ProductId } from "@/config/product-moods";
import { cn } from "@/lib/utils";

interface ProductInsightStageProps {
  productId: ProductId;
  cards: readonly FloatingInsightCardProps[];
  className?: string;
  /** Show wallet badge when product has Advantage Wallet */
  showWalletBadge?: boolean;
}

/**
 * Interactive COMPASS centrepiece — calibration on load, needle toward conversation on navigate.
 */
export function ProductInsightStage({
  productId,
  cards,
  className,
  showWalletBadge,
}: ProductInsightStageProps) {
  const [primary, secondary, tertiary] = cards;
  const mood = getProductMood(productId);
  const { theme, hasAdvantageWallet } = mood;
  const [glowPrimary, glowAccent] = theme.heroGlow;
  const reduceMotion = useReducedMotion();
  const needleControls = useAnimationControls();
  const needleId = `needle_${productId.replace(/-/g, "_")}`;

  useEffect(() => {
    if (reduceMotion) return;
    void needleControls.start({
      rotate: [0, -10, 8, -4, 0],
      transition: { duration: 1.75, ease: [0.22, 1, 0.36, 1] },
    });
  }, [needleControls, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    const onNavigate = () => {
      void needleControls.start({
        rotate: [0, 105, 96],
        transition: { duration: 1.15, ease: [0.22, 1, 0.36, 1] },
      });
    };
    window.addEventListener("compass:navigate", onNavigate as EventListener);
    return () => window.removeEventListener("compass:navigate", onNavigate as EventListener);
  }, [needleControls, reduceMotion]);

  const compassCore = (
    <div className="pointer-events-none absolute left-1/2 top-[46%] z-10 -translate-x-1/2 -translate-y-1/2">
      <div className="relative h-[252px] w-[252px]">
        <div className="absolute inset-0 rounded-full border border-primary/25 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_24px_70px_-30px_rgba(0,0,0,0.85),0_0_40px_-16px_var(--glow)] backdrop-blur-2xl" />
        <div className="absolute inset-[10px] rounded-full border border-white/[0.08] bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.10),transparent_55%)]" />
        <div className="absolute inset-[18px] rounded-full border border-primary/15 bg-[radial-gradient(circle_at_60%_70%,rgba(255,255,255,0.06),transparent_55%)]" />
        <div className="absolute inset-[34px] text-primary/90">
          <CompassIllustration className="max-w-none" />
        </div>
        <motion.div
          className="absolute left-1/2 top-1/2 h-[148px] w-[148px] -translate-x-1/2 -translate-y-1/2"
          style={{ transformOrigin: "50% 50%" }}
          initial={false}
          animate={needleControls}
        >
          <svg viewBox="0 0 148 148" className="h-full w-full" fill="none" aria-hidden>
            <defs>
              <linearGradient id={needleId} x1="40" y1="18" x2="108" y2="130" gradientUnits="userSpaceOnUse">
                <stop stopColor={theme.needleFrom} stopOpacity="0.9" />
                <stop offset="1" stopColor={theme.needleTo} stopOpacity="0.9" />
              </linearGradient>
            </defs>
            <path d="M74 14 L84 74 L74 66 L64 74 Z" fill={`url(#${needleId})`} opacity="0.95" />
            <path d="M74 134 L84 74 L74 82 L64 74 Z" fill="rgba(255,255,255,0.10)" />
            <circle
              cx="74"
              cy="74"
              r="10"
              fill="rgba(6,8,13,0.7)"
              stroke={theme.primary}
              strokeOpacity="0.55"
              strokeWidth="3"
            />
          </svg>
        </motion.div>
      </div>
    </div>
  );

  return (
    <div className={cn("relative w-full", className)}>
      {/* Desktop */}
      <div className="relative mx-auto hidden min-h-[480px] w-full max-w-lg lg:block xl:min-h-[520px]">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[74%] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: `radial-gradient(circle, ${glowPrimary}, transparent 68%)` }}
        />
        {glowAccent ? (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: `radial-gradient(circle, ${glowAccent}, transparent 70%)` }}
          />
        ) : null}

        <div className="absolute right-[14%] top-3 z-30">
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary shadow-[0_0_22px_-10px_var(--glow)]">
            AI Powered
          </span>
        </div>
        {(showWalletBadge ?? hasAdvantageWallet) ? (
          <div className="absolute left-8 top-20 z-30">
            <span className="rounded-full border border-accent/35 bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
              Limited Period Offer
            </span>
          </div>
        ) : null}

        {compassCore}

        {primary ? (
          <div className="absolute left-0 top-6 z-20 w-[58%] max-w-[250px]">
            <FloatingInsightCard {...primary} />
          </div>
        ) : null}
        {secondary ? (
          <div className="absolute right-0 top-[22%] z-20 w-[50%] max-w-[215px]">
            <FloatingInsightCard {...secondary} />
          </div>
        ) : null}
        {tertiary ? (
          <div className="absolute bottom-0 left-[10%] z-20 w-[64%] max-w-[270px]">
            <FloatingInsightCard {...tertiary} />
          </div>
        ) : null}
      </div>

      {/* Tablet */}
      <div className="hidden md:block lg:hidden">
        <div className="mx-auto mb-6 flex max-w-[200px] justify-center opacity-80">
          <CompassIllustration />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {primary ? (
            <div className="col-span-2">
              <FloatingInsightCard {...primary} />
            </div>
          ) : null}
          {secondary ? <FloatingInsightCard {...secondary} /> : null}
          {tertiary ? <FloatingInsightCard {...tertiary} /> : null}
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <div className="mx-auto mb-5 flex max-w-[180px] justify-center opacity-80">
          <CompassIllustration />
        </div>
        <div className="space-y-3">
          {primary ? <FloatingInsightCard {...primary} /> : null}
          {secondary ? <FloatingInsightCard {...secondary} /> : null}
          {tertiary ? <FloatingInsightCard {...tertiary} /> : null}
        </div>
      </div>
    </div>
  );
}

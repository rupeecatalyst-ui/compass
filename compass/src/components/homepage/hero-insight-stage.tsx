"use client";

import { CompassIllustration } from "@/components/marketing/compass-illustration";
import { FloatingInsightCard } from "@/components/homepage/floating-insight-card";
import { homeLoanFloatingCards } from "@/config/home-loan-floating-cards";
import { cn } from "@/lib/utils";

interface HeroInsightStageProps {
  className?: string;
}

/**
 * Illustration + floating intelligence cards.
 * Richer desktop composition with soft radial glow and subtle connectors.
 */
export function HeroInsightStage({ className }: HeroInsightStageProps) {
  const [primary, advantage, expert] = homeLoanFloatingCards;

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative mx-auto hidden min-h-[460px] w-full max-w-lg lg:block xl:min-h-[500px]">
        {/* Soft radial glow + subtle connectors */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(45,212,191,0.14),transparent_68%)]" />
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
          viewBox="0 0 400 460"
          fill="none"
          aria-hidden
        >
          <path
            d="M120 90 C170 140, 210 160, 200 230"
            stroke="rgba(45,212,191,0.35)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
          <path
            d="M280 220 C250 250, 220 270, 200 240"
            stroke="rgba(45,212,191,0.28)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
          <path
            d="M150 360 C175 310, 190 280, 200 250"
            stroke="rgba(45,212,191,0.28)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
        </svg>

        <div className="absolute left-[18%] top-3 z-30">
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary shadow-[0_0_20px_-8px_var(--glow)]">
            AI Powered
          </span>
        </div>
        <div className="absolute right-2 top-16 z-30">
          <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
            Limited Period Offer
          </span>
        </div>

        <div className="absolute left-1/2 top-[42%] w-[54%] -translate-x-1/2 -translate-y-1/2">
          <CompassIllustration />
        </div>

        <div className="absolute left-0 top-10 z-20 w-[56%] max-w-[240px]">
          <FloatingInsightCard {...primary} />
        </div>

        <div className="absolute right-0 top-[34%] z-10 w-[50%] max-w-[210px]">
          <FloatingInsightCard {...advantage} />
        </div>

        <div className="absolute bottom-0 left-[6%] z-20 w-[60%] max-w-[250px]">
          <FloatingInsightCard {...expert} />
        </div>
      </div>

      <div className="hidden md:block lg:hidden">
        <div className="mx-auto mb-6 max-w-[240px]">
          <CompassIllustration />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <FloatingInsightCard {...primary} />
          </div>
          <FloatingInsightCard {...advantage} />
          <FloatingInsightCard {...expert} />
        </div>
      </div>

      <div className="md:hidden">
        <div className="mx-auto mb-5 max-w-[200px]">
          <CompassIllustration />
        </div>
        <div className="space-y-3">
          <FloatingInsightCard {...primary} />
          <FloatingInsightCard {...advantage} />
          <FloatingInsightCard {...expert} />
        </div>
      </div>
    </div>
  );
}

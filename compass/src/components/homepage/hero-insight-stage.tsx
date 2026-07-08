"use client";

import { CompassIllustration } from "@/components/marketing/compass-illustration";
import { FloatingInsightCard } from "@/components/homepage/floating-insight-card";
import { homeLoanFloatingCards } from "@/config/home-loan-floating-cards";
import { cn } from "@/lib/utils";

interface HeroInsightStageProps {
  className?: string;
}

/**
 * Illustration + floating intelligence cards for the Home Loan hero.
 * Desktop: cards float around the illustration.
 * Mobile: primary card first, remaining cards stacked below.
 */
export function HeroInsightStage({ className }: HeroInsightStageProps) {
  const [primary, advantage, expert] = homeLoanFloatingCards;

  return (
    <div className={cn("relative w-full", className)}>
      {/* Desktop / large tablet composition */}
      <div className="relative mx-auto hidden min-h-[420px] w-full max-w-lg lg:block xl:min-h-[460px]">
        <div className="absolute left-1/2 top-1/2 w-[58%] -translate-x-1/2 -translate-y-1/2">
          <CompassIllustration />
        </div>

        <div className="absolute left-0 top-2 z-20 w-[58%] max-w-[240px]">
          <FloatingInsightCard {...primary} />
        </div>

        <div className="absolute right-0 top-[38%] z-10 w-[52%] max-w-[210px]">
          <FloatingInsightCard {...advantage} />
        </div>

        <div className="absolute bottom-0 left-[8%] z-20 w-[62%] max-w-[250px]">
          <FloatingInsightCard {...expert} />
        </div>
      </div>

      {/* Tablet: illustration + two-column cards */}
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

      {/* Mobile: one highlighted card + stack */}
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

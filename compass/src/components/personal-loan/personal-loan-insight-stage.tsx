"use client";

import { FloatingInsightCard } from "@/components/homepage/floating-insight-card";
import { PersonalLoanIllustration } from "@/components/marketing/personal-loan-illustration";
import { personalLoanFloatingCards } from "@/config/personal-loan-floating-cards";
import { cn } from "@/lib/utils";

export function PersonalLoanInsightStage({ className }: { className?: string }) {
  const [instant, wallet, fastTrack] = personalLoanFloatingCards;

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative mx-auto hidden min-h-[480px] w-full max-w-lg lg:block xl:min-h-[520px]">
        {/* Premium blue glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[74%] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.16),transparent_68%)]" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.10),transparent_70%)]" />

        {/* Subtle illustration backdrop */}
        <div className="absolute left-1/2 top-[44%] w-[92%] -translate-x-1/2 -translate-y-1/2">
          <PersonalLoanIllustration />
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

        {/* Cards: new arrangement (faster, more forward) */}
        <div className="absolute left-0 top-6 z-20 w-[58%] max-w-[250px]">
          <FloatingInsightCard {...instant} />
        </div>
        <div className="absolute right-0 top-[30%] z-20 w-[50%] max-w-[215px]">
          <FloatingInsightCard {...wallet} />
        </div>
        <div className="absolute bottom-2 left-[18%] z-20 w-[64%] max-w-[270px]">
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


"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { IntelligenceBadge } from "@/components/coaching/intelligence-badge";
import { Button } from "@/components/ui/button";
import { ctaCopy } from "@/config/cta";
import { ROUTES } from "@/constants/routes";

interface ComingSoonPanelProps {
  title?: string;
  description?: string;
  outcomes?: readonly string[];
  ctaHref?: string;
  ctaLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export function ComingSoonPanel({
  title = "Coming Soon",
  description = "This experience is being prepared. Explore related coaches or speak with our team — no calculations run here yet.",
  outcomes = [
    "Clear next steps without pressure",
    "Guidance shaped by Catalyst One Intelligence",
    "No hardcoded formulas on COMPASS",
  ],
  ctaHref = ROUTES.CONTACT,
  ctaLabel = ctaCopy.secondary.talkToUs,
  secondaryHref = ROUTES.COACHES,
  secondaryLabel = ctaCopy.secondary.browseCoaches,
}: ComingSoonPanelProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-10">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-border/70 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </span>
          <IntelligenceBadge compact />
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
        <ul className="grid gap-2 sm:grid-cols-3">
          {outcomes.map((item) => (
            <li
              key={item}
              className="rounded-xl border border-border/50 bg-surface/40 px-3 py-3 text-left text-xs leading-relaxed text-muted-foreground sm:text-sm"
            >
              {item}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" className="h-12" asChild>
            <Link href={ctaHref}>
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-12 bg-transparent" asChild>
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

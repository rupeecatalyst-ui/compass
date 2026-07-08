"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeader, SectionReveal } from "@/components/homepage/shared/section-reveal";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

/**
 * Lightweight anchor for floating card destinations.
 * Strategy Assessment is Coming Soon — no calculations.
 */
export function StrategyAssessmentSection() {
  return (
    <SectionReveal id="strategy-assessment" className="border-y border-border/40 bg-surface/30">
      <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12">
        <SectionHeader
          align="left"
          eyebrow="Home Loan Strategy Assessment"
          headline="Your personalised strategy starts here"
          subheadline="A calm next step toward clearer lender fit and borrowing confidence. Full assessment experience coming soon — no forms required yet."
        />
        <div className="rounded-2xl glass-panel p-6 sm:p-8">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Floating intelligence cards open this assessment. Calculators and matching logic stay
            inside Catalyst One — COMPASS keeps the journey simple.
          </p>
          <Button size="lg" className="mt-6 h-12" asChild>
            <Link href={ROUTES.CONTACT}>
              Talk to us
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </SectionReveal>
  );
}

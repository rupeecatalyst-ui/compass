"use client";

import Link from "next/link";
import { ArrowRight, Eye, Scale, Sparkles } from "lucide-react";
import { PageFade } from "@/components/marketing/page-fade";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionContainer } from "@/components/marketing/section-container";
import { Button } from "@/components/ui/button";
import { aboutContent } from "@/config/content";
import { ctaCopy } from "@/config/cta";
import { ROUTES } from "@/constants/routes";

const pillarIcons = [Sparkles, Scale, Eye] as const;

export function AboutPageContent() {
  return (
    <PageFade>
      <PageHero
        eyebrow="About Us"
        headline={aboutContent.headline}
        subheadline={aboutContent.intro}
      />

      <SectionContainer className="pt-8 pb-12">
        <div className="grid gap-4 md:grid-cols-3">
          {aboutContent.pillars.map((pillar, index) => {
            const Icon = pillarIcons[index] ?? Sparkles;
            return (
              <article key={pillar.title} className="rounded-2xl glass-panel p-6 sm:p-7">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="mt-5 text-xl font-semibold tracking-tight">{pillar.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {pillar.description}
                </p>
              </article>
            );
          })}
        </div>
      </SectionContainer>

      <SectionContainer className="pt-0 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-surface-elevated to-accent/5 px-6 py-12 text-center sm:px-10 sm:py-14">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to borrow with clarity?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
            Start with the Home Loan journey, or speak with our team.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="h-12 px-8" asChild>
              <Link href={ROUTES.HOME_LOAN}>
                {ctaCopy.primary.exploreHomeLoan}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 bg-transparent" asChild>
              <Link href={ROUTES.CONTACT}>{ctaCopy.secondary.talkToUs}</Link>
            </Button>
          </div>
        </div>
      </SectionContainer>
    </PageFade>
  );
}

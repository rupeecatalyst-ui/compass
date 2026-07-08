"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ComingSoonPanel } from "@/components/coaching/coming-soon-panel";
import { IntelligenceBadge } from "@/components/coaching/intelligence-badge";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionContainer } from "@/components/marketing/section-container";
import { Button } from "@/components/ui/button";
import { coaches } from "@/config/coaching";
import { ROUTES, toolRoute } from "@/constants/routes";

type Coach = (typeof coaches)[number];

interface CoachLandingContentProps {
  coach: Exclude<Coach, { slug: "home-loan" }> | Coach;
}

export function CoachLandingContent({ coach }: CoachLandingContentProps) {
  return (
    <>
      <PageHero
        eyebrow={coach.eyebrow}
        headline={`${coach.headline} ${coach.headlineAccent}`}
        subheadline={coach.subheadline}
      />

      <SectionContainer className="pt-2 pb-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <IntelligenceBadge />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href={ROUTES.CONTACT}>
                Start this journey
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" className="bg-transparent" asChild>
              <Link href={ROUTES.TOOLS}>Explore tools</Link>
            </Button>
          </div>
        </div>
      </SectionContainer>

      <SectionContainer className="pt-4 pb-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Thought Stream
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            {coach.thoughtHeadline}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            No forms yet — only the questions that matter before you decide.
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {coach.thoughts.map((thought, index) => (
            <div
              key={thought}
              className="rounded-2xl border border-border/60 bg-surface/40 p-5 transition-colors hover:border-primary/25 hover:bg-surface/70"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="mt-3 text-base font-semibold leading-snug">{thought}</p>
            </div>
          ))}
        </div>
      </SectionContainer>

      <SectionContainer className="pt-4 pb-20">
        <ComingSoonPanel
          title="Coach experience — Coming Soon"
          description={`${coach.title} guidance deeper than this landing is on the way. Related calculators will appear here with Catalyst One Intelligence — no formulas on COMPASS.`}
          ctaHref={toolRoute("compass-advantage")}
          ctaLabel="See COMPASS Advantage"
        />

        <div className="mt-8 text-center">
          <Button variant="ghost" asChild>
            <Link href={ROUTES.COACHES}>← All coaches</Link>
          </Button>
        </div>
      </SectionContainer>
    </>
  );
}

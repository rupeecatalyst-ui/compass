"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ComingSoonPanel } from "@/components/coaching/coming-soon-panel";
import { IntelligenceBadge } from "@/components/coaching/intelligence-badge";
import { CompassIllustration } from "@/components/marketing/compass-illustration";
import { PageFade } from "@/components/marketing/page-fade";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionContainer } from "@/components/marketing/section-container";
import { Button } from "@/components/ui/button";
import { coaches } from "@/config/coaching";
import { ctaCopy } from "@/config/cta";
import { ROUTES, toolRoute } from "@/constants/routes";

type Coach = (typeof coaches)[number];

interface CoachLandingContentProps {
  coach: Coach;
}

export function CoachLandingContent({ coach }: CoachLandingContentProps) {
  return (
    <PageFade>
      <PageHero
        eyebrow={coach.eyebrow}
        headline={`${coach.headline} ${coach.headlineAccent}`}
        subheadline={coach.subheadline}
      >
        <div className="mx-auto max-w-[200px]">
          <CompassIllustration />
        </div>
      </PageHero>

      <SectionContainer className="pt-0 pb-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <IntelligenceBadge />
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button size="lg" className="h-12" asChild>
              <Link href={ROUTES.CONTACT}>
                {ctaCopy.primary.startJourney}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 bg-transparent" asChild>
              <Link href={ROUTES.TOOLS}>{ctaCopy.primary.viewTools}</Link>
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
            <div key={thought} className="rounded-2xl glass-panel p-5">
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
          title="Coming Soon"
          description={`${coach.title} goes deeper soon. Related calculators will appear with Catalyst One Intelligence — no formulas on COMPASS.`}
          ctaHref={toolRoute("compass-advantage")}
          ctaLabel="See COMPASS Advantage"
          secondaryHref={ROUTES.COACHES}
          secondaryLabel={ctaCopy.secondary.browseCoaches}
        />

        <div className="mt-8 text-center">
          <Button variant="ghost" asChild>
            <Link href={ROUTES.COACHES}>← All coaches</Link>
          </Button>
        </div>
      </SectionContainer>
    </PageFade>
  );
}

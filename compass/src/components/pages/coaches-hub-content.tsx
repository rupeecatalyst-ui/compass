"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionContainer } from "@/components/marketing/section-container";
import { Button } from "@/components/ui/button";
import { coaches } from "@/config/coaching";
import { ROUTES, coachRoute } from "@/constants/routes";

export function CoachesHubContent() {
  return (
    <>
      <PageHero
        eyebrow="Coaches"
        headline="Your borrowing coaches"
        subheadline="Product-specific guidance journeys — calm, mobile-first, and free of forms until you are ready."
      />

      <SectionContainer className="pt-8 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coaches.map((coach) => (
            <article
              key={coach.slug}
              className="group flex h-full flex-col overflow-hidden rounded-2xl glass-panel glass-panel-hover p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                {coach.eyebrow}
              </p>
              <h2 className="mt-3 text-xl font-semibold tracking-tight">{coach.shortTitle}</h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                {coach.subheadline}
              </p>
              <Button variant="ghost" size="sm" className="mt-5 w-fit px-0 text-primary" asChild>
                <Link href={coachRoute(coach.slug)}>
                  Open coach
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </article>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/60 bg-surface/50 px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="font-semibold">Need a tool instead?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse Financial Intelligence calculators — Coming Soon shells only for now.
            </p>
          </div>
          <Button asChild>
            <Link href={ROUTES.TOOLS}>
              View tools
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </SectionContainer>
    </>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { aboutPageContent } from "@/config/about";
import { ctaCopy } from "@/config/cta";
import { ROUTES } from "@/constants/routes";
import { PageFade } from "@/components/marketing/page-fade";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionContainer } from "@/components/marketing/section-container";
import { CompanyStatisticsMeter } from "@/components/marketing/company-statistics-meter";
import { Button } from "@/components/ui/button";

export function AboutPageContent() {
  const rahul = aboutPageContent.leadership.people[0];
  const ketan = aboutPageContent.leadership.people[1];

  return (
    <PageFade>
      <PageHero
        eyebrow={aboutPageContent.eyebrow}
        headline={aboutPageContent.headline}
      >
        <p className="mx-auto max-w-2xl text-sm font-medium tracking-wide text-primary sm:text-base">
          {aboutPageContent.tagline}
        </p>
        <div className="mx-auto mt-6 max-w-3xl space-y-4 text-left text-sm leading-relaxed text-muted-foreground sm:text-base">
          {aboutPageContent.introduction.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </div>
      </PageHero>

      <SectionContainer className="pt-4 pb-12">
        <CompanyStatisticsMeter />
      </SectionContainer>

      <SectionContainer className="pt-0 pb-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {aboutPageContent.whatWeDo.heading}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              We assist clients across:
            </p>
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {aboutPageContent.whatWeDo.supporting}
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {aboutPageContent.whatWeDo.items.map((item) => (
              <li
                key={item}
                className="rounded-2xl glass-panel px-4 py-4 text-sm leading-relaxed text-foreground/90"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </SectionContainer>

      <SectionContainer className="pt-0 pb-16">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {aboutPageContent.approach.heading}
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {aboutPageContent.approach.pillars.map((pillar) => (
            <article key={pillar.title} className="rounded-2xl glass-panel p-6 sm:p-7">
              <h3 className="text-lg font-semibold tracking-tight">{pillar.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {pillar.description}
              </p>
            </article>
          ))}
        </div>
      </SectionContainer>

      <SectionContainer className="pt-0 pb-16">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {aboutPageContent.leadership.heading}
        </h2>
        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <article className="rounded-3xl glass-panel p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-sm font-semibold tracking-wide text-primary"
                aria-hidden
              >
                {rahul.initials}
              </div>
              <div>
                <h3 className="text-xl font-semibold tracking-tight">{rahul.name}</h3>
                <p className="mt-1 text-sm text-primary">{rahul.title}</p>
              </div>
            </div>
            <div className="mt-6 max-w-prose space-y-4 text-sm leading-relaxed text-muted-foreground">
              {rahul.profile.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
            {"experience" in rahul ? (
              <>
                <p className="mt-6 text-sm font-medium text-foreground">
                  {rahul.experienceHeading}
                </p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {rahul.experience.map((item) => (
                    <li
                      key={item}
                      className="rounded-xl border border-border/50 bg-white/[0.03] px-3 py-2 text-sm text-foreground/85"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {"philosophy" in rahul ? (
              <p className="mt-6 max-w-prose text-sm leading-relaxed text-muted-foreground">
                {rahul.philosophy}
              </p>
            ) : null}
            {"personal" in rahul ? (
              <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
                {rahul.personal}
              </p>
            ) : null}
            {"quote" in rahul ? (
              <blockquote className="mt-8 border-l-2 border-primary/50 pl-4 text-base italic text-foreground/90">
                “{rahul.quote}”
              </blockquote>
            ) : null}
          </article>

          <article className="rounded-3xl glass-panel p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-sm font-semibold tracking-wide text-primary"
                aria-hidden
              >
                {ketan.initials}
              </div>
              <div>
                <h3 className="text-xl font-semibold tracking-tight">{ketan.name}</h3>
                <p className="mt-1 text-sm text-primary">{ketan.title}</p>
              </div>
            </div>
            <div className="mt-6 max-w-prose space-y-4 text-sm leading-relaxed text-muted-foreground">
              {ketan.profile.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          </article>
        </div>
      </SectionContainer>

      <SectionContainer className="pt-0 pb-12">
        <article className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-surface-elevated to-accent/5 p-6 sm:p-10">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {aboutPageContent.compass.heading}
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {aboutPageContent.compass.copy}
          </p>
        </article>
      </SectionContainer>

      <SectionContainer className="pt-0 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-surface-elevated to-accent/5 px-6 py-12 text-center sm:px-10 sm:py-14">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {aboutPageContent.closing.headline}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
            {aboutPageContent.closing.subheadline}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="h-12 px-8" asChild>
              <Link href={ROUTES.HOME_LOAN}>
                {ctaCopy.primary.discoverMyAdvantage}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 bg-transparent" asChild>
              <Link href={ROUTES.CONTACT}>{ctaCopy.secondary.speakWithInvestmentBanker}</Link>
            </Button>
          </div>
        </div>
      </SectionContainer>
    </PageFade>
  );
}

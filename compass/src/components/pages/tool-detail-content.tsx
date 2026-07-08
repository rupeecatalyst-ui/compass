"use client";

import Link from "next/link";
import { ComingSoonPanel } from "@/components/coaching/coming-soon-panel";
import { IntelligenceBadge } from "@/components/coaching/intelligence-badge";
import { CompassIllustration } from "@/components/marketing/compass-illustration";
import { PageFade } from "@/components/marketing/page-fade";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionContainer } from "@/components/marketing/section-container";
import { Button } from "@/components/ui/button";
import { tools } from "@/config/coaching";
import { ctaCopy } from "@/config/cta";
import { ROUTES } from "@/constants/routes";

type Tool = (typeof tools)[number];

interface ToolDetailContentProps {
  tool: Tool;
}

export function ToolDetailContent({ tool }: ToolDetailContentProps) {
  return (
    <PageFade>
      <PageHero eyebrow={tool.category} headline={tool.title} subheadline={tool.description}>
        <div className="mx-auto max-w-[180px]">
          <CompassIllustration />
        </div>
      </PageHero>

      <SectionContainer className="pt-2 pb-6">
        <div className="flex justify-center sm:justify-start">
          <IntelligenceBadge />
        </div>
      </SectionContainer>

      <SectionContainer className="pt-2 pb-8">
        <div className="grid gap-4 md:grid-cols-3">
          {["Inputs", "Insight", "Next step"].map((label, index) => (
            <div
              key={label}
              className="rounded-2xl border border-dashed border-border/70 bg-surface/30 p-5 text-center"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {String(index + 1).padStart(2, "0")} · {label}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">Empty state — no calculation yet.</p>
            </div>
          ))}
        </div>
      </SectionContainer>

      <SectionContainer className="pt-2 pb-20">
        <ComingSoonPanel
          title="Coming Soon"
          description={`${tool.title} will help customers make clearer decisions. Results will be powered by Catalyst One Intelligence — COMPASS will not hardcode formulas.`}
          ctaHref={ROUTES.CONTACT}
          ctaLabel={ctaCopy.secondary.talkToUs}
          secondaryHref={ROUTES.TOOLS}
          secondaryLabel="All tools"
        />

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="ghost" asChild>
            <Link href={ROUTES.TOOLS}>← All tools</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href={ROUTES.COACHES}>{ctaCopy.secondary.browseCoaches}</Link>
          </Button>
        </div>
      </SectionContainer>
    </PageFade>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { IntelligenceBadge } from "@/components/coaching/intelligence-badge";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionContainer } from "@/components/marketing/section-container";
import { Button } from "@/components/ui/button";
import { tools } from "@/config/coaching";
import { toolRoute } from "@/constants/routes";

export function ToolsHubContent() {
  return (
    <>
      <PageHero
        eyebrow="Financial Intelligence"
        headline="Tools for clearer decisions"
        subheadline="Premium calculators and decision aids — Coming Soon. Each will run on Catalyst One Intelligence, not hardcoded COMPASS formulas."
      />

      <SectionContainer className="pt-4 pb-4">
        <div className="flex justify-center">
          <IntelligenceBadge />
        </div>
      </SectionContainer>

      <SectionContainer className="pt-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <article
              key={tool.slug}
              className="group flex h-full flex-col overflow-hidden rounded-2xl glass-panel glass-panel-hover p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full border border-border/70 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {tool.category}
                </span>
                <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                  Coming Soon
                </span>
              </div>
              <h2 className="mt-5 text-lg font-semibold tracking-tight">{tool.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {tool.description}
              </p>
              <Button variant="ghost" size="sm" className="mt-5 w-fit px-0 text-primary" asChild>
                <Link href={toolRoute(tool.slug)}>
                  Open tool
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </article>
          ))}
        </div>
      </SectionContainer>
    </>
  );
}

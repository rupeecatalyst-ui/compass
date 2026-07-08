"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageFade } from "@/components/marketing/page-fade";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionContainer } from "@/components/marketing/section-container";
import { Button } from "@/components/ui/button";
import { placeholderPages } from "@/config/content";
import { ctaCopy } from "@/config/cta";
import { ROUTES } from "@/constants/routes";

interface PlaceholderPageContentProps {
  page: keyof typeof placeholderPages;
}

export function PlaceholderPageContent({ page }: PlaceholderPageContentProps) {
  const content = placeholderPages[page];

  return (
    <PageFade>
      <PageHero
        eyebrow={content.status}
        headline={content.headline}
        subheadline={content.description}
      />

      <SectionContainer className="pt-4 pb-20">
        <div className="mx-auto max-w-xl rounded-2xl glass-panel p-8 text-center sm:p-10">
          <p className="text-sm leading-relaxed text-muted-foreground">
            This experience is being prepared. Meanwhile, explore the Home Loan journey or speak
            with our team.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="h-12" asChild>
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

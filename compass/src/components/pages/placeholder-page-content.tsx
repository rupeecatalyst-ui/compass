"use client";

import Link from "next/link";
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
            This experience is being prepared. It is not available yet.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" variant="outline" className="h-12 bg-transparent" asChild>
              <Link href={ROUTES.CONTACT}>{ctaCopy.secondary.talkToUs}</Link>
            </Button>
          </div>
        </div>
      </SectionContainer>
    </PageFade>
  );
}

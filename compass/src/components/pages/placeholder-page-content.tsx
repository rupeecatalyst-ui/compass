"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionContainer } from "@/components/marketing/section-container";
import { Button } from "@/components/ui/button";
import { placeholderPages } from "@/config/content";
import { ROUTES } from "@/constants/routes";

interface PlaceholderPageContentProps {
  page: keyof typeof placeholderPages;
}

export function PlaceholderPageContent({ page }: PlaceholderPageContentProps) {
  const content = placeholderPages[page];

  return (
    <>
      <PageHero
        eyebrow={content.status}
        headline={content.headline}
        subheadline={content.description}
      />

      <SectionContainer className="pt-4 pb-20">
        <div className="mx-auto max-w-xl rounded-2xl glass-panel p-8 text-center sm:p-10">
          <p className="text-sm text-muted-foreground leading-relaxed">
            This experience is being prepared. Meanwhile, explore the Home Loan journey or speak
            with our team.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link href={ROUTES.HOME_LOAN}>
                Home Loan Coach
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" className="bg-transparent" asChild>
              <Link href={ROUTES.CONTACT}>Contact Us</Link>
            </Button>
          </div>
        </div>
      </SectionContainer>
    </>
  );
}

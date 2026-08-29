"use client";

import { PageFade } from "@/components/marketing/page-fade";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionContainer } from "@/components/marketing/section-container";

type LegalSection = {
  heading: string;
  body: string;
};

type LegalPage = {
  title: string;
  lastUpdated: string;
  sections: readonly LegalSection[];
};

export function LegalPageContent({ content }: { content: LegalPage }) {
  return (
    <PageFade>
      <PageHero eyebrow="Legal" headline={content.title} subheadline={`Last updated: ${content.lastUpdated}`} />
      <SectionContainer className="pb-20 pt-4">
        <div className="mx-auto max-w-3xl space-y-8">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-semibold text-foreground">{section.heading}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
      </SectionContainer>
    </PageFade>
  );
}

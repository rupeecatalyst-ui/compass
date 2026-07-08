import Link from "next/link";
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
    <SectionContainer className="pt-12 sm:pt-16 pb-20">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {content.status}
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">{content.headline}</h1>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">{content.description}</p>
        <Button className="mt-8" asChild>
          <Link href={ROUTES.CONTACT}>Contact Us</Link>
        </Button>
      </div>
    </SectionContainer>
  );
}

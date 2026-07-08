"use client";

import Link from "next/link";
import { Mail, MapPin, Phone, ArrowRight } from "lucide-react";
import { PageFade } from "@/components/marketing/page-fade";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionContainer } from "@/components/marketing/section-container";
import { Button } from "@/components/ui/button";
import { contactContent } from "@/config/content";
import { ctaCopy } from "@/config/cta";
import { siteConfig } from "@/config/site";
import { ROUTES } from "@/constants/routes";

export function ContactPageContent() {
  return (
    <PageFade>
      <PageHero
        eyebrow="Contact Us"
        headline={contactContent.headline}
        subheadline={contactContent.intro}
      />

      <SectionContainer className="pt-8 pb-20">
        <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
          <a
            href={`mailto:${siteConfig.contactEmail}`}
            className="rounded-2xl glass-panel glass-panel-hover p-6 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <h2 className="mt-4 text-base font-semibold">Email</h2>
            <p className="mt-2 break-all text-sm text-muted-foreground">{siteConfig.contactEmail}</p>
          </a>

          <div className="rounded-2xl glass-panel p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <Phone className="h-4 w-4 text-primary" />
            </div>
            <h2 className="mt-4 text-base font-semibold">Phone</h2>
            <p className="mt-2 text-sm text-muted-foreground">{siteConfig.contactPhone}</p>
          </div>

          <div className="rounded-2xl glass-panel p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <h2 className="mt-4 text-base font-semibold">Office</h2>
            <p className="mt-2 text-sm text-muted-foreground">Mumbai, India</p>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-2xl rounded-2xl glass-panel p-6 text-center sm:p-8">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Prefer to explore first? Begin with the Home Loan Coach — no long forms, just clarity.
          </p>
          <Button size="lg" className="mt-6 h-12" asChild>
            <Link href={ROUTES.HOME_LOAN}>
              {ctaCopy.primary.exploreHomeLoan}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </SectionContainer>
    </PageFade>
  );
}

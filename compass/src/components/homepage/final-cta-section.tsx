"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { SectionReveal } from "@/components/homepage/shared/section-reveal";
import { useDiscoverClick } from "@/components/product-experience/use-discover-click";
import { Button } from "@/components/ui/button";
import { homeLoanLanding } from "@/config/home-loan-landing";
import { ROUTES } from "@/constants/routes";

export function FinalCtaSection() {
  const { finalCta } = homeLoanLanding;
  const onDiscoverClick = useDiscoverClick(ROUTES.HOME_LOAN);

  return (
    <SectionReveal id="journey-cta" className="pb-24 sm:pb-32">
      <motion.div
        initial={false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-surface-elevated to-accent/10 px-6 py-14 text-center sm:px-12 sm:py-20"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(45,212,191,0.12),transparent)]" />
        <div className="relative">
          {"empathyLine" in finalCta && finalCta.empathyLine ? (
            <p className="mb-4 text-sm font-medium italic text-accent/90">{finalCta.empathyLine}</p>
          ) : null}
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {finalCta.headline}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground sm:text-lg">
            {finalCta.subheadline}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="h-12 px-8" asChild>
              <a href="?discovery=launch" onClick={onDiscoverClick}>
                {finalCta.cta}
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="h-12 bg-transparent" asChild>
              <Link href={ROUTES.CONTACT}>Talk To Us</Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </SectionReveal>
  );
}

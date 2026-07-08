"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { SectionReveal } from "@/components/homepage/shared/section-reveal";
import { Button } from "@/components/ui/button";
import { homepageV2 } from "@/config/homepage";
import { ROUTES } from "@/constants/routes";

export function FinalCtaSection() {
  const { finalCta } = homepageV2;

  return (
    <SectionReveal className="pb-24 sm:pb-32">
      <motion.div
        initial={false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-surface-elevated to-accent/10 px-6 py-14 text-center sm:px-12 sm:py-20"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(45,212,191,0.12),transparent)]" />
        <div className="relative">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {finalCta.headline}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground sm:text-lg">
            {finalCta.subheadline}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="h-12 px-8" asChild>
              <Link href={ROUTES.HOME_LOAN}>
                Start with Home Loan
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 border-border/80 bg-transparent hover:bg-white/5"
              asChild
            >
              <Link href={ROUTES.CONTACT}>{finalCta.cta}</Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </SectionReveal>
  );
}

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
        className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-surface-elevated to-accent/10 px-8 py-16 text-center sm:px-12 sm:py-20"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(45,212,191,0.12),transparent)]" />
        <div className="relative">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">{finalCta.headline}</h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground sm:text-lg">{finalCta.subheadline}</p>
          <Button size="lg" className="mt-8 h-12 px-8" asChild>
            <Link href={ROUTES.CONTACT}>
              {finalCta.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </motion.div>
    </SectionReveal>
  );
}

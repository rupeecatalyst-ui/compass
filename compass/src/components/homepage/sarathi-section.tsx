"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Compass } from "lucide-react";
import { SectionHeader, SectionReveal } from "@/components/homepage/shared/section-reveal";
import { Button } from "@/components/ui/button";
import { homeLoanLanding } from "@/config/home-loan-landing";
import { staggerContainer, staggerItem } from "@/lib/animations";

export function SarathiSection() {
  const { sarathi } = homeLoanLanding;

  return (
    <SectionReveal id="sarathi" className="relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(45,212,191,0.08),transparent)]" />

      <div className="relative grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <SectionHeader
          align="left"
          eyebrow={sarathi.eyebrow}
          headline={sarathi.title}
          subheadline={sarathi.description}
        />

        <motion.div
          initial={false}
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="relative"
        >
          <motion.div
            variants={staggerItem}
            className="relative overflow-hidden rounded-2xl glass-panel p-6 sm:p-8"
          >
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

            <div className="relative flex items-start gap-4">
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(45,212,191,0.2)",
                    "0 0 40px rgba(45,212,191,0.35)",
                    "0 0 20px rgba(45,212,191,0.2)",
                  ],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/15"
              >
                <Compass className="h-7 w-7 text-primary" />
              </motion.div>

              <div className="min-w-0 flex-1 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Sarathi</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">Guidance you can trust</p>
                </div>

                <p className="text-sm leading-relaxed text-foreground/85">
                  Understand recommendations in plain language — then decide with confidence.
                </p>

                <div className="flex flex-wrap gap-2">
                  {sarathi.frames.map((frame) => (
                    <span
                      key={frame}
                      className="rounded-full border border-border/50 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      {frame}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <Button className="relative mt-6 w-full sm:w-auto" variant="outline" asChild>
              <Link href="#journey-cta">
                {sarathi.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </SectionReveal>
  );
}

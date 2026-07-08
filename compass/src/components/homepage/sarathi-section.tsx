"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { SectionHeader, SectionReveal } from "@/components/homepage/shared/section-reveal";
import { Button } from "@/components/ui/button";
import { homepageV2 } from "@/config/homepage";
import { ROUTES } from "@/constants/routes";
import { staggerContainer, staggerItem } from "@/lib/animations";

export function SarathiSection() {
  const { sarathi } = homepageV2;

  return (
    <SectionReveal id="sarathi" className="relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(45,212,191,0.08),transparent)]" />

      <div className="relative grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <SectionHeader
          align="left"
          eyebrow="Sarathi"
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
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 border border-primary/25"
              >
                <Sparkles className="h-7 w-7 text-primary" />
              </motion.div>

              <div className="min-w-0 flex-1 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">{sarathi.name}</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">Guidance, not guesswork</p>
                </div>

                <div className="space-y-3 rounded-xl border border-border/60 bg-surface/80 p-4">
                  <p className="text-sm text-foreground/90 leading-relaxed">{sarathi.sampleInsight.what}</p>
                  <p className="text-xs font-medium text-primary">{sarathi.sampleInsight.action}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {["What", "Why", "Impact", "Next Step"].map((frame) => (
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
              <Link href={ROUTES.CONTACT}>
                {sarathi.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          <motion.p
            variants={staggerItem}
            className="mt-4 text-center text-xs text-muted-foreground lg:text-left"
          >
            Your AI financial guide — curious, coaching, never policing.
          </motion.p>
        </motion.div>
      </div>
    </SectionReveal>
  );
}

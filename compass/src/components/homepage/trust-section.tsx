"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { AnimatedCounter } from "@/components/homepage/shared/animated-counter";
import { SectionHeader, SectionReveal } from "@/components/homepage/shared/section-reveal";
import { Button } from "@/components/ui/button";
import { homepageV2 } from "@/config/homepage";

export function TrustSection() {
  const { trust } = homepageV2;
  const [index, setIndex] = useState(0);
  const current = trust.testimonials[index];

  const go = (dir: -1 | 1) => {
    setIndex((prev) => (prev + dir + trust.testimonials.length) % trust.testimonials.length);
  };

  return (
    <SectionReveal id="trust">
      <SectionHeader headline={trust.headline} subheadline={trust.subheadline} />

      <div className="mt-14 rounded-2xl border border-border/50 glass-panel p-6 sm:p-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {trust.stats.map((stat) => (
            <AnimatedCounter
              key={stat.id}
              value={"value" in stat ? stat.value : 0}
              prefix={"prefix" in stat ? stat.prefix : undefined}
              suffix={"suffix" in stat ? stat.suffix : undefined}
              displayValue={"displayValue" in stat ? stat.displayValue : undefined}
              label={stat.label}
            />
          ))}
        </div>
      </div>

      <div className="mt-12">
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Lending Ecosystem
        </p>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {trust.lenders.map((lender, i) => (
            <motion.span
              key={lender}
              initial={false}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="rounded-full border border-border/50 bg-white/[0.03] px-4 py-2 text-xs font-medium text-muted-foreground"
            >
              {lender}
            </motion.span>
          ))}
        </div>
      </div>

      <div className="relative mx-auto mt-14 max-w-3xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl border border-border/50 glass-panel p-8 sm:p-10"
          >
            <Quote className="h-8 w-8 text-primary/40" aria-hidden />
            <blockquote className="mt-4 text-lg leading-relaxed text-foreground/95">
              &ldquo;{current.quote}&rdquo;
            </blockquote>
            <footer className="mt-8 flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                {current.initials}
              </div>
              <div>
                <p className="font-medium">{current.author}</p>
                <p className="text-sm text-muted-foreground">{current.context}</p>
              </div>
            </footer>
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="outline" size="icon" onClick={() => go(-1)} aria-label="Previous testimonial" className="border-border/60 bg-transparent">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex gap-2">
            {trust.testimonials.map((t, i) => (
              <button
                key={t.id}
                type="button"
                aria-label={`Testimonial ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"}`}
              />
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={() => go(1)} aria-label="Next testimonial" className="border-border/60 bg-transparent">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </SectionReveal>
  );
}

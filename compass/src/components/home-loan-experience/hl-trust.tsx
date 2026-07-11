"use client";

import { motion, useReducedMotion } from "framer-motion";
import { HlBody, HlChapter, HlEyebrow, HlHeadline } from "@/components/home-loan-experience/hl-chapter";
import { homeLoanExperience } from "@/config/home-loan-experience";
import { smoothEase } from "@/lib/animations";

export function HlTrust() {
  const { trust } = homeLoanExperience;
  const reduceMotion = useReducedMotion();

  return (
    <HlChapter id="trust" className="border-t border-white/[0.04] bg-[#06080d]">
      <div className="mb-12 text-center">
        <HlEyebrow className="text-center">{trust.eyebrow}</HlEyebrow>
        <HlHeadline className="mx-auto max-w-2xl">{trust.headline}</HlHeadline>
        <HlBody className="mx-auto mt-4 max-w-lg">{trust.subheadline}</HlBody>
      </div>

      <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3 sm:gap-5">
        {trust.pillars.map((pillar, index) => (
          <motion.div
            key={pillar.title}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1, ease: smoothEase }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-7"
          >
            <h3 className="text-lg font-semibold tracking-tight">{pillar.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{pillar.body}</p>
          </motion.div>
        ))}
      </div>
    </HlChapter>
  );
}

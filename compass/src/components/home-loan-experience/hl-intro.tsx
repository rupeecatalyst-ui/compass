"use client";

import { motion, useReducedMotion } from "framer-motion";
import { HlChapter } from "@/components/home-loan-experience/hl-chapter";
import { homeLoanExperience } from "@/config/home-loan-experience";
import { smoothEase } from "@/lib/animations";

export function HlIntro() {
  const { intro } = homeLoanExperience;
  const reduceMotion = useReducedMotion();

  return (
    <HlChapter id="intro" className="bg-[#06080d]">
      <div className="mx-auto max-w-3xl space-y-10 text-center sm:space-y-14">
        {intro.lines.map((line, index) => (
          <motion.p
            key={line}
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.7, delay: index * 0.12, ease: smoothEase }}
            className={
              index === intro.lines.length - 1
                ? "text-2xl font-medium tracking-[-0.02em] text-foreground sm:text-3xl lg:text-4xl"
                : "text-xl font-light leading-relaxed text-muted-foreground sm:text-2xl sm:leading-relaxed"
            }
          >
            {line}
          </motion.p>
        ))}
      </div>
    </HlChapter>
  );
}

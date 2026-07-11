"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { HlBody, HlChapter, HlEyebrow, HlGlassCard, HlHeadline } from "@/components/home-loan-experience/hl-chapter";
import { homeLoanExperience } from "@/config/home-loan-experience";
import { smoothEase } from "@/lib/animations";
import { cn } from "@/lib/utils";

export function HlDocuments() {
  const { documents } = homeLoanExperience;
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const reduceMotion = useReducedMotion();

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <HlChapter id="documents" dark className="border-t border-white/[0.04]">
      <div className="mb-12 text-center">
        <HlEyebrow className="text-center">{documents.eyebrow}</HlEyebrow>
        <HlHeadline className="mx-auto max-w-2xl">{documents.headline}</HlHeadline>
        <HlBody className="mx-auto mt-4 max-w-lg">{documents.subheadline}</HlBody>
      </div>

      <HlGlassCard className="mx-auto max-w-2xl">
        <ul className="space-y-1">
          {documents.checklist.map((item, index) => {
            const done = checked.has(item.id);
            return (
              <motion.li
                key={item.id}
                initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.06, ease: smoothEase }}
              >
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className={cn(
                    "flex w-full items-start gap-4 rounded-2xl px-3 py-4 text-left transition-colors duration-300",
                    "hover:bg-white/[0.03]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all duration-300",
                      done
                        ? "border-primary/40 bg-primary/20 text-primary"
                        : "border-white/10 bg-white/[0.02]",
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                </button>
              </motion.li>
            );
          })}
        </ul>
        <p className="mt-6 border-t border-white/[0.06] pt-5 text-center text-xs text-muted-foreground">
          This is a guide — not an upload form. We&apos;ll collect documents when you&apos;re ready.
        </p>
      </HlGlassCard>
    </HlChapter>
  );
}

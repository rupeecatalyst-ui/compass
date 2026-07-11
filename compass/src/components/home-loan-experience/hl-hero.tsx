"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, MessageCircle } from "lucide-react";
import { useDiscovery } from "@/components/home-loan-experience/discovery/discovery-context";
import { HeroCompass, PremiumHomeVisual } from "@/components/home-loan-experience/hl-premium-visuals";
import { HlBody, HlHeadline } from "@/components/home-loan-experience/hl-chapter";
import { Button } from "@/components/ui/button";
import { homeLoanExperience } from "@/config/home-loan-experience";
import { smoothEase } from "@/lib/animations";

export function HlHero() {
  const { hero } = homeLoanExperience;
  const { launchDiscovery, isOpen } = useDiscovery();
  const reduceMotion = useReducedMotion();

  const handleSarathiCta = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById("advantage-conversation")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <section
      className="relative flex min-h-[100dvh] flex-col justify-center overflow-hidden bg-[#05070c] transition-[filter,opacity] duration-700"
      style={isOpen ? { filter: "blur(4px)", opacity: 0.6 } : undefined}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(45,212,191,0.08),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_100%,rgba(74,222,128,0.05),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:64px_64px]" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 pb-16 pt-24 sm:px-8 lg:px-10 lg:pb-20 lg:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: smoothEase }}
            className="space-y-8 text-left"
          >
            <HeroCompass className="lg:hidden" />

            <div className="space-y-5">
              <HlHeadline as="h1" className="text-gradient-subtle">
                {hero.headline}
              </HlHeadline>
              <HlBody className="max-w-md text-foreground/75">{hero.supporting}</HlBody>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                size="lg"
                className="h-12 px-8 text-base"
                onClick={() => launchDiscovery()}
              >
                {hero.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="h-12 border-white/10 bg-white/[0.02] px-8 text-base hover:bg-white/[0.05]"
                asChild
              >
                <a href="#advantage-conversation" onClick={handleSarathiCta}>
                  <MessageCircle className="h-4 w-4" />
                  {hero.secondaryCta}
                </a>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.15, ease: smoothEase }}
            className="relative hidden lg:block"
          >
            <div className="relative">
              <PremiumHomeVisual />
              <div className="absolute -left-4 top-8">
                <HeroCompass />
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: smoothEase }}
          className="mt-10 lg:hidden"
        >
          <PremiumHomeVisual className="mx-auto max-w-md" />
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={reduceMotion ? undefined : { y: [0, 6, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      >
        <div className="h-8 w-[1px] bg-gradient-to-b from-transparent via-primary/40 to-transparent" />
      </motion.div>
    </section>
  );
}

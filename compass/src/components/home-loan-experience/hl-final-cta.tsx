"use client";



import Link from "next/link";

import { motion, useReducedMotion } from "framer-motion";

import { ArrowRight } from "lucide-react";

import { useDiscovery } from "@/components/home-loan-experience/discovery/discovery-context";

import { HlChapter } from "@/components/home-loan-experience/hl-chapter";

import { Button } from "@/components/ui/button";

import { homeLoanExperience } from "@/config/home-loan-experience";

import { ROUTES } from "@/constants/routes";

import { smoothEase } from "@/lib/animations";



export function HlFinalCta() {

  const { finalCta } = homeLoanExperience;

  const { openDiscovery } = useDiscovery();

  const reduceMotion = useReducedMotion();



  return (

    <HlChapter id="final-cta" className="pb-8">

      <motion.div

        initial={reduceMotion ? false : { opacity: 0, y: 20 }}

        whileInView={{ opacity: 1, y: 0 }}

        viewport={{ once: true }}

        transition={{ duration: 0.7, ease: smoothEase }}

        className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/[0.12] via-[#0a0f17] to-accent/[0.08] px-8 py-16 text-center sm:px-14 sm:py-24"

      >

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(45,212,191,0.14),transparent)]" />

        <div className="relative space-y-6">

          {finalCta.empathy ? (

            <p className="text-sm font-medium italic text-accent/90">{finalCta.empathy}</p>

          ) : null}

          <h2 className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl lg:text-5xl">{finalCta.headline}</h2>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">

            <Button size="lg" className="h-12 px-10 text-base" onClick={openDiscovery}>

              {finalCta.cta}

              <ArrowRight className="h-4 w-4" />

            </Button>

            <Button size="lg" variant="outline" className="h-12 bg-transparent px-8" asChild>

              <Link href={ROUTES.CONTACT}>Talk To Us</Link>

            </Button>

          </div>

        </div>

      </motion.div>

    </HlChapter>

  );

}



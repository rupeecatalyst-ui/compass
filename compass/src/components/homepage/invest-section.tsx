"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { SectionHeader, SectionReveal } from "@/components/homepage/shared/section-reveal";
import { Button } from "@/components/ui/button";
import { homepageV2 } from "@/config/homepage";
import { ROUTES } from "@/constants/routes";

/** Product-neutral invest entry — routes to goal selection. */
export function InvestSection() {
  const { invest } = homepageV2;

  return (
    <SectionReveal id="invest" className="bg-surface/30">
      <SectionHeader headline={invest.headline} subheadline={invest.subheadline} />
      <motion.div
        initial={false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mt-10 flex justify-center"
      >
        <Button size="lg" variant="outline" className="h-12 border-accent/30 bg-transparent px-10 hover:bg-accent/5" asChild>
          <Link href={ROUTES.INVEST}>
            {invest.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </motion.div>
    </SectionReveal>
  );
}

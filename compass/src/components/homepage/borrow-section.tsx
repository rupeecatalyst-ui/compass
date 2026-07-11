"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { SectionHeader, SectionReveal } from "@/components/homepage/shared/section-reveal";
import { Button } from "@/components/ui/button";
import { homepageV2 } from "@/config/homepage";
import { ROUTES } from "@/constants/routes";

/** Product-neutral borrow entry — routes to goal selection, not individual products. */
export function BorrowSection() {
  const { borrow } = homepageV2;

  return (
    <SectionReveal id="borrow">
      <SectionHeader headline={borrow.headline} subheadline={borrow.subheadline} />
      <motion.div
        initial={false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mt-10 flex justify-center"
      >
        <Button size="lg" className="h-12 px-10" asChild>
          <Link href={ROUTES.BORROW}>
            {borrow.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </motion.div>
    </SectionReveal>
  );
}

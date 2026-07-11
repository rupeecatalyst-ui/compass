"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BorrowCategoryCard } from "@/components/platform/borrow-category-card";
import { borrowCategories, borrowNavigation } from "@/config/borrow-navigation";
import { smoothEase } from "@/lib/animations";

/** Level 2 — Borrow navigation layer. Products only; psychology begins on product pages. */
export function BorrowPageContent() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#05070c]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(45,212,191,0.08),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.3] [background-image:linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:64px_64px]" />

      <div className="relative mx-auto w-full max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: smoothEase }}
          className="mb-10 text-center sm:mb-12"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Borrow</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl lg:text-5xl">
            {borrowNavigation.headline}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            {borrowNavigation.subtext}
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2">
          {borrowCategories.map((category, index) => (
            <BorrowCategoryCard key={category.id} category={category} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

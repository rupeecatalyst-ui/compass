"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { getStartedConfig } from "@/config/get-started";
import { smoothEase } from "@/lib/animations";
import { cn } from "@/lib/utils";

function PathCard({
  title,
  subtitle,
  description,
  href,
  variant,
  index,
}: {
  title: string;
  subtitle: string;
  description: string;
  href: string;
  variant: "borrow" | "invest";
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.1, duration: 0.55, ease: smoothEase }}
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-2xl glass-panel glass-panel-hover"
    >
      <Link href={href} className="absolute inset-0 z-10" aria-label={`${title} journey`} />
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full blur-3xl transition-opacity duration-500 opacity-60 group-hover:opacity-100",
          variant === "borrow" ? "bg-primary/20" : "bg-accent/20",
        )}
      />
      <div className="relative p-8 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">{subtitle}</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">{title}</h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
        <div
          className={cn(
            "mt-6 inline-flex items-center gap-2 text-sm font-medium",
            variant === "borrow" ? "text-primary" : "text-accent",
          )}
          aria-hidden
        >
          Continue
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </motion.div>
  );
}

/** Platform entry — Borrow or Invest selection. */
export function GetStartedPageContent() {
  const reduceMotion = useReducedMotion();
  const { headline, subtext, borrow, invest } = getStartedConfig;

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#05070c]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(45,212,191,0.1),transparent_55%)]" />

      <div className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-5 py-20 sm:px-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: smoothEase }}
          className="mb-10 text-center sm:mb-12"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">COMPASS</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl lg:text-5xl">
            {headline}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">{subtext}</p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2">
          <PathCard {...borrow} variant="borrow" index={0} />
          <PathCard {...invest} variant="invest" index={1} />
        </div>
      </div>
    </div>
  );
}

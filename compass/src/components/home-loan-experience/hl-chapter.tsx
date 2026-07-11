"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeUp, viewportOnce } from "@/lib/animations";

interface HlChapterProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  /** Full viewport height chapter */
  full?: boolean;
  dark?: boolean;
}

/**
 * Scroll chapter wrapper — fade, glass depth, premium spacing.
 */
export function HlChapter({ id, children, className, full, dark }: HlChapterProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <section
        id={id}
        className={cn(
          "relative",
          full && "min-h-screen",
          dark && "bg-[#05070c]",
          className,
        )}
      >
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-10">{children}</div>
      </section>
    );
  }

  return (
    <motion.section
      id={id}
      initial={false}
      whileInView="animate"
      viewport={{ ...viewportOnce, margin: "-60px" }}
      variants={fadeUp}
      className={cn(
        "relative",
        full && "flex min-h-screen items-center",
        dark && "bg-[#05070c]",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28 lg:px-10 lg:py-32">
        {children}
      </div>
    </motion.section>
  );
}

interface HlEyebrowProps {
  children: React.ReactNode;
  className?: string;
}

export function HlEyebrow({ children, className }: HlEyebrowProps) {
  return (
    <p
      className={cn(
        "mb-5 text-[11px] font-medium uppercase tracking-[0.28em] text-primary/80",
        className,
      )}
    >
      {children}
    </p>
  );
}

interface HlHeadlineProps {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}

export function HlHeadline({ children, className, as: Tag = "h2" }: HlHeadlineProps) {
  return (
    <Tag
      className={cn(
        "font-semibold tracking-[-0.02em] text-foreground",
        Tag === "h1" && "text-4xl sm:text-5xl lg:text-6xl lg:leading-[1.08]",
        Tag === "h2" && "text-3xl sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]",
        Tag === "h3" && "text-2xl sm:text-3xl",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function HlBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-base leading-relaxed text-muted-foreground sm:text-lg sm:leading-relaxed", className)}>
      {children}
    </p>
  );
}

export function HlGlassCard({
  children,
  className,
  glow,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-2xl sm:p-8",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_32px_80px_-40px_rgba(0,0,0,0.85)]",
        glow && "shadow-[0_0_60px_-20px_var(--glow)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

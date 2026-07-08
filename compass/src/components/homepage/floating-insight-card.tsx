"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Sparkles, Users, Wallet, type LucideIcon } from "lucide-react";
import { smoothEase } from "@/lib/animations";
import { cn } from "@/lib/utils";

export type FloatingCardEmphasis = "primary" | "accent" | "default";
export type FloatingCardAnimationVariant = "float-a" | "float-b" | "float-c";
export type FloatingCardIcon = "sparkles" | "wallet" | "users";

const iconMap: Record<FloatingCardIcon, LucideIcon> = {
  sparkles: Sparkles,
  wallet: Wallet,
  users: Users,
};

const floatMotion: Record<
  FloatingCardAnimationVariant,
  { y: number[]; duration: number; delay: number }
> = {
  "float-a": { y: [0, -3, 0], duration: 5.5, delay: 0 },
  "float-b": { y: [0, -4, 0], duration: 6.2, delay: 0.4 },
  "float-c": { y: [0, -2.5, 0], duration: 5.8, delay: 0.8 },
};

export interface FloatingInsightCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: FloatingCardIcon;
  items?: readonly string[];
  highlightValue?: string;
  highlightLabel?: string;
  destination: string;
  isClickable?: boolean;
  animationVariant?: FloatingCardAnimationVariant;
  emphasis?: FloatingCardEmphasis;
  className?: string;
}

export function FloatingInsightCard({
  title,
  subtitle,
  badge,
  icon = "sparkles",
  items,
  highlightValue,
  highlightLabel,
  destination,
  isClickable = true,
  animationVariant = "float-a",
  emphasis = "default",
  className,
}: FloatingInsightCardProps) {
  const reduceMotion = useReducedMotion();
  const Icon = iconMap[icon];
  const float = floatMotion[animationVariant];

  const cardBody = (
    <>
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.07] via-transparent to-transparent" />
      <div className="relative flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
            emphasis === "primary" && "border-primary/35 bg-primary/15 text-primary",
            emphasis === "accent" && "border-accent/35 bg-accent/10 text-accent",
            emphasis === "default" && "border-primary/20 bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        {badge ? (
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
              emphasis === "primary" && "border-primary/30 bg-primary/10 text-primary",
              emphasis === "accent" && "border-accent/30 bg-accent/10 text-accent",
              emphasis === "default" && "border-border/70 bg-white/[0.04] text-muted-foreground",
            )}
          >
            {badge}
          </span>
        ) : null}
      </div>

      <h3 className="relative mt-3 text-sm font-semibold tracking-tight text-foreground sm:text-[0.95rem]">
        {title}
      </h3>
      {subtitle ? (
        <p className="relative mt-1 text-xs text-muted-foreground">{subtitle}</p>
      ) : null}

      {highlightValue ? (
        <p className="relative mt-3 text-2xl font-bold tracking-tight text-gradient sm:text-3xl">
          {highlightValue}
        </p>
      ) : null}
      {highlightLabel ? (
        <p className="relative mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {highlightLabel}
        </p>
      ) : null}

      {items?.length ? (
        <ul className="relative mt-3 space-y-1.5">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs text-foreground/90 sm:text-[13px]">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );

  const surfaceClass = cn(
    "group relative block w-full overflow-hidden rounded-2xl glass-panel p-4 text-left sm:p-5",
    "shadow-[0_18px_40px_-24px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.04)_inset]",
    "transition-[transform,box-shadow,border-color] duration-500 ease-out",
    isClickable &&
      "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    isClickable &&
      "hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_24px_50px_-20px_rgba(0,0,0,0.8),0_0_36px_-12px_var(--glow)]",
    emphasis === "primary" && "border-primary/25 shadow-[0_20px_48px_-22px_rgba(0,0,0,0.8),0_0_40px_-16px_var(--glow)]",
    className,
  );

  const inner = (
    <motion.div
      className="h-full"
      animate={
        reduceMotion || !isClickable
          ? undefined
          : { y: float.y }
      }
      transition={
        reduceMotion
          ? undefined
          : {
              duration: float.duration,
              delay: float.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }
      }
    >
      {isClickable ? (
        <Link href={destination} className={surfaceClass} aria-label={`${title} — open strategy assessment`}>
          {cardBody}
        </Link>
      ) : (
        <div className={surfaceClass}>{cardBody}</div>
      )}
    </motion.div>
  );

  return (
    <motion.div
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, ease: smoothEase }}
      className="h-full"
    >
      {inner}
    </motion.div>
  );
}

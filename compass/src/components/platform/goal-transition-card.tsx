"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { smoothEase } from "@/lib/animations";

interface GoalTransitionCardProps {
  title: string;
  insight: string;
  href: string;
  icon: React.ReactNode;
  index: number;
  variant?: "borrow" | "invest";
}

/** Entire card is clickable — no Learn More buttons. */
export function GoalTransitionCard({
  title,
  insight,
  href,
  icon,
  index,
  variant = "borrow",
}: GoalTransitionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.08, duration: 0.55, ease: smoothEase }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="h-full"
    >
      <Link
        href={href}
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-xl transition-colors duration-300",
          "hover:border-primary/25 hover:bg-white/[0.04]",
          variant === "invest" && "hover:border-accent/25",
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full blur-3xl transition-opacity duration-500 opacity-0 group-hover:opacity-100",
            variant === "borrow" ? "bg-primary/15" : "bg-accent/15",
          )}
        />
        <span
          className={cn(
            "relative flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
            variant === "borrow"
              ? "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
              : "bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground",
          )}
        >
          {icon}
        </span>
        <h2 className="relative mt-5 text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{insight}</p>
      </Link>
    </motion.div>
  );
}

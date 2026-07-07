"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type LoanOriginationSectionTheme = "blue" | "purple" | "amber" | "emerald";

const THEME_STYLES: Record<
  LoanOriginationSectionTheme,
  { border: string; header: string; icon: string }
> = {
  blue: {
    border: "border-blue-600/30 bg-gradient-to-br from-blue-600/[0.08] via-blue-500/[0.04] to-transparent",
    header: "text-blue-900 dark:text-blue-200",
    icon: "bg-blue-600/15 text-blue-700 ring-blue-600/20 dark:text-blue-300",
  },
  purple: {
    border: "border-violet-600/30 bg-gradient-to-br from-violet-600/[0.08] via-violet-500/[0.04] to-transparent",
    header: "text-violet-900 dark:text-violet-200",
    icon: "bg-violet-600/15 text-violet-700 ring-violet-600/20 dark:text-violet-300",
  },
  amber: {
    border: "border-amber-600/30 bg-gradient-to-br from-amber-600/[0.08] via-amber-500/[0.04] to-transparent",
    header: "text-amber-900 dark:text-amber-200",
    icon: "bg-amber-600/15 text-amber-700 ring-amber-600/20 dark:text-amber-300",
  },
  emerald: {
    border: "border-emerald-600/30 bg-gradient-to-br from-emerald-600/[0.08] via-emerald-500/[0.04] to-transparent",
    header: "text-emerald-900 dark:text-emerald-200",
    icon: "bg-emerald-600/15 text-emerald-700 ring-emerald-600/20 dark:text-emerald-300",
  },
};

interface LoanOriginationSectionProps {
  theme: LoanOriginationSectionTheme;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** UX-03 — Themed enterprise section for loan origination forms. */
export function LoanOriginationSection({
  theme,
  title,
  description,
  icon,
  children,
  className,
}: LoanOriginationSectionProps) {
  const styles = THEME_STYLES[theme];

  return (
    <section
      className={cn(
        "rounded-xl border p-4 shadow-sm sm:p-5",
        styles.border,
        className,
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        {icon && (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1",
              styles.icon,
            )}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 className={cn("text-sm font-semibold tracking-wide", styles.header)}>{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

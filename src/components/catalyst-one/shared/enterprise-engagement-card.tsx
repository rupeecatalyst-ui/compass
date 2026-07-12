"use client";

import { cn } from "@/lib/utils";

export type EnterpriseCardTone = "blue" | "emerald" | "amber" | "rose" | "violet" | "slate" | "cyan";

const TONE_STYLES: Record<EnterpriseCardTone, string> = {
  blue: "border-blue-200/80 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/40 dark:to-card dark:border-blue-900/50",
  emerald:
    "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/40 dark:to-card dark:border-emerald-900/50",
  amber:
    "border-amber-200/80 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/40 dark:to-card dark:border-amber-900/50",
  rose: "border-rose-200/80 bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/40 dark:to-card dark:border-rose-900/50",
  violet:
    "border-violet-200/80 bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/40 dark:to-card dark:border-violet-900/50",
  slate:
    "border-slate-200/80 bg-gradient-to-br from-slate-50 to-white dark:from-slate-950/40 dark:to-card dark:border-slate-800/50",
  cyan: "border-cyan-200/80 bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/40 dark:to-card dark:border-cyan-900/50",
};

const ACCENT: Record<EnterpriseCardTone, string> = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  violet: "bg-violet-500",
  slate: "bg-slate-500",
  cyan: "bg-cyan-500",
};

interface EnterpriseEngagementCardProps {
  title: string;
  description?: string;
  tone?: EnterpriseCardTone;
  badge?: string;
  meta?: string;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/** Professional colourful cards — enterprise engagement without excess. */
export function EnterpriseEngagementCard({
  title,
  description,
  tone = "slate",
  badge,
  meta,
  children,
  className,
  onClick,
}: EnterpriseEngagementCardProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
      className={cn(
        "relative overflow-hidden rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        TONE_STYLES[tone],
        onClick && "cursor-pointer",
        className,
      )}
    >
      <div className={cn("absolute left-0 top-0 h-full w-1", ACCENT[tone])} />
      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
          {meta && <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">{meta}</p>}
        </div>
        {badge && (
          <span className="shrink-0 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-foreground ring-1 ring-border">
            {badge}
          </span>
        )}
      </div>
      {children && <div className="mt-3 pl-2">{children}</div>}
    </div>
  );
}

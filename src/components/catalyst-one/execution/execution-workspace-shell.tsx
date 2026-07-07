"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ExecutionTheme = "blue" | "purple" | "amber";

const themeStyles: Record<ExecutionTheme, { border: string; header: string; badge: string }> = {
  blue: {
    border: "border-blue-600/25 bg-gradient-to-br from-blue-600/[0.08] via-blue-500/[0.04] to-transparent",
    header: "text-blue-900 dark:text-blue-200",
    badge: "border-blue-600/20 bg-blue-600/10 text-blue-800 dark:text-blue-200",
  },
  purple: {
    border:
      "border-violet-600/25 bg-gradient-to-br from-violet-600/[0.08] via-violet-500/[0.04] to-transparent",
    header: "text-violet-900 dark:text-violet-200",
    badge: "border-violet-600/20 bg-violet-600/10 text-violet-800 dark:text-violet-200",
  },
  amber: {
    border:
      "border-amber-600/25 bg-gradient-to-br from-amber-600/[0.08] via-amber-500/[0.04] to-transparent",
    header: "text-amber-900 dark:text-amber-200",
    badge: "border-amber-600/20 bg-amber-600/10 text-amber-800 dark:text-amber-200",
  },
};

export function ExecutionWorkspaceShell({
  theme,
  title,
  subtitle,
  statusLabel,
  search,
  onSearchChange,
  actions,
  children,
  className,
}: {
  theme: ExecutionTheme;
  title: string;
  subtitle?: string;
  statusLabel?: string;
  search: string;
  onSearchChange: (value: string) => void;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const styles = themeStyles[theme];

  return (
    <section className={cn("rounded-xl border shadow-sm", styles.border, className)}>
      <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn("text-sm font-semibold tracking-wide", styles.header)}>{title}</h3>
            {statusLabel && (
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", styles.badge)}>
                {statusLabel}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>

      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-xs"
            placeholder={`Search ${title.toLowerCase()}...`}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="p-4 pt-0 sm:p-5 sm:pt-0">{children}</div>
    </section>
  );
}


"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardVizCard({
  title,
  children,
  className,
  action,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <article
      className={cn(
        "ei-card flex min-h-0 flex-col p-3.5 md:p-4",
        className,
      )}
    >
      <header className="mb-2 flex items-start justify-between gap-2">
        <h3 className="ei-display text-sm font-semibold tracking-tight text-[var(--ei-ink)] md:text-[15px]">
          {title}
        </h3>
        {action}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </article>
  );
}

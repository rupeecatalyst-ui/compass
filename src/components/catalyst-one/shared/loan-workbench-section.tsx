"use client";

import { cn } from "@/lib/utils";

export interface LoanWorkbenchSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/** UX-01C — Enterprise card section for the loan workbench left panel. */
export function LoanWorkbenchSection({
  title,
  description,
  children,
  className,
}: LoanWorkbenchSectionProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border/60 bg-card p-5 shadow-sm sm:p-6",
        "ring-1 ring-black/[0.02] dark:ring-white/[0.03]",
        className,
      )}
    >
      <div className="mb-5">
        <h4 className="text-sm font-semibold tracking-tight text-foreground">{title}</h4>
        {description && (
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

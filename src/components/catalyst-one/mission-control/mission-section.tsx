import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

export function MissionSection({
  title,
  subtitle,
  children,
  className,
  id,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("space-y-3", className)}>
      <div className="border-b border-border/50 pb-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/90">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export function IntelGrid({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 | 5 }) {
  const grid =
    cols === 2
      ? "grid-cols-2"
      : cols === 3
        ? "grid-cols-2 sm:grid-cols-3"
        : cols === 5
          ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
          : "grid-cols-2 sm:grid-cols-4";
  return <div className={cn("grid gap-2", grid)}>{children}</div>;
}

export function IntelCell({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "blue" | "amber" | "red" | "slate";
}) {
  const accentCls = {
    green: "text-emerald-700 dark:text-emerald-300",
    blue: "text-blue-700 dark:text-blue-300",
    amber: "text-amber-700 dark:text-amber-300",
    red: "text-red-700 dark:text-red-300",
    slate: "text-foreground",
  }[accent ?? "slate"];

  return (
    <div className="rounded-lg border border-border/60 bg-card/50 px-3 py-2.5">
      <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-sm font-semibold tabular-nums", accentCls)}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

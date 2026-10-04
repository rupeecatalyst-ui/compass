"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function EmployeePwaRecordCard({
  href,
  title,
  lines,
  badge,
}: {
  href: string;
  title: string;
  lines: string[];
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block min-h-12 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold leading-5">{title}</h2>
        {badge ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {badge}
          </span>
        ) : null}
      </div>
      <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </Link>
  );
}

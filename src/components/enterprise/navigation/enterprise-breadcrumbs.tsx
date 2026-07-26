"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { BreadcrumbItem } from "@/types/navigation";
import { cn } from "@/lib/utils";

/**
 * CO-UX-115 — Clickable enterprise breadcrumbs.
 */
export function EnterpriseBreadcrumbs({
  items,
  className,
  appearance = "default",
}: {
  items: BreadcrumbItem[];
  className?: string;
  appearance?: "default" | "mission-control";
}) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-[11px]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const label = item.title;
          return (
            <li key={`${label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 ? (
                <ChevronRight
                  className={cn(
                    "h-3 w-3 shrink-0",
                    appearance === "mission-control" ? "text-zinc-600" : "text-muted-foreground",
                  )}
                  aria-hidden
                />
              ) : null}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={cn(
                    "truncate font-medium transition-colors",
                    appearance === "mission-control"
                      ? "text-zinc-400 hover:text-zinc-100"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "truncate font-semibold",
                    appearance === "mission-control" ? "text-zinc-100" : "text-foreground",
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

"use client";

/**
 * CO-MARKETING-MKT-01 — Compact section nav for Marketing Command Center shells.
 */

import Link from "next/link";
import { MARKETING_COMMAND_CENTER_SECTIONS } from "@/constants/enterprise-marketing-engine";
import { cn } from "@/lib/utils";

export function MarketingModuleNav(props: { activeId?: string }) {
  return (
    <nav
      aria-label="Marketing module sections"
      className="flex flex-wrap gap-1.5 rounded-lg border border-border/70 bg-muted/30 p-2"
    >
      {MARKETING_COMMAND_CENTER_SECTIONS.map((section) => {
        const active = props.activeId === section.id || (!props.activeId && section.id === "home");
        return (
          <Link
            key={section.id}
            href={section.href}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {section.title}
          </Link>
        );
      })}
    </nav>
  );
}

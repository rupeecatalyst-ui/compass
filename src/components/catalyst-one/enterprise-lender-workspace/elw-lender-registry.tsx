"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, CalendarClock, MapPin, UserRound } from "lucide-react";
import { buildElwWorkspaceHref } from "@/constants/enterprise-lender-workspace";
import { listElwLandingCards } from "@/lib/enterprise-lender-workspace/landing";
import type { ElwRelationshipStatus } from "@/types/enterprise-lender-workspace";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function statusLabel(s: ElwRelationshipStatus): string {
  switch (s) {
    case "active":
      return "Active";
    case "building":
      return "Building";
    case "dormant":
      return "Dormant";
    default:
      return "Onboarding";
  }
}

function statusVariant(s: ElwRelationshipStatus): "success" | "info" | "muted" | "warning" {
  switch (s) {
    case "active":
      return "success";
    case "building":
      return "info";
    case "dormant":
      return "warning";
    default:
      return "muted";
  }
}

/**
 * Lender Master — premium enterprise landing cards.
 */
export function ElwLenderRegistry() {
  const cards = useMemo(() => listElwLandingCards(), []);

  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Enterprise knowledge center for every lender — open a workspace to explore products, policy
        placeholders, and relationship hierarchy.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const href = buildElwWorkspaceHref(card.lenderId, {
            from: "lenders",
            returnTo: "/lenders",
          });
          return (
            <Link
              key={card.lenderRef}
              href={href}
              className={cn(
                "group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm",
                "transition-colors duration-200 hover:border-teal-500/35 hover:shadow-md",
              )}
            >
              <div className="flex items-start gap-3 border-b border-border/60 bg-gradient-to-r from-teal-500/[0.07] via-transparent to-transparent p-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-teal-500/25 bg-teal-500/10 text-sm font-bold text-teal-900 dark:text-teal-100">
                  {card.logoInitials || <Building2 className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold tracking-tight group-hover:underline">
                      {card.name}
                    </h3>
                    <StatusPill variant={statusVariant(card.relationshipStatus)}>
                      {statusLabel(card.relationshipStatus)}
                    </StatusPill>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <CalendarClock className="h-3 w-3" />
                    Last policy update · {card.lastPolicyUpdate}
                  </p>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Products offered
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {card.productsOffered.map((p) => (
                      <span
                        key={p}
                        className="rounded-md border border-border/70 bg-muted/30 px-2 py-0.5 text-[11px]"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Cities covered
                  </p>
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                    {card.citiesCovered.join(" · ")}
                  </p>
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/50 pt-3">
                  <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <UserRound className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {card.primaryContactName ?? "Primary contact · unassigned"}
                    </span>
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0 text-[11px]"
                    tabIndex={-1}
                  >
                    Open
                  </Button>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Building2, ExternalLink } from "lucide-react";
import {
  buildElwWorkspaceHref,
  ELW_CERTIFICATION_FINDING,
  ELW_ENTERPRISE_PRINCIPLE,
  ELW_FRAMEWORK_VERSION,
} from "@/constants/enterprise-lender-workspace";
import { listElwRegistryEntries } from "@/lib/enterprise-lender-workspace";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function categoryFor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("housing") || n.includes("hfc")) return "HFC";
  if (n.includes("nbfc") || n.includes("finance")) return "NBFC";
  return "Bank";
}

function productsLabel(count: number): string {
  if (count <= 0) return "—";
  if (count === 1) return "1 product";
  return `${count} products`;
}

function relationshipScore(contactCount: number, productCount: number): number {
  return Math.min(98, 55 + contactCount * 8 + productCount * 5);
}

/**
 * Prompt 011 PART 5 — Enterprise Data Grid for Lender Master (100+ lenders ready).
 */
export function ElwLenderRegistry() {
  const entries = listElwRegistryEntries();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill variant="info">{ELW_CERTIFICATION_FINDING}</StatusPill>
        <StatusPill variant="muted">{ELW_FRAMEWORK_VERSION}</StatusPill>
      </div>
      <p className="text-sm text-muted-foreground">{ELW_ENTERPRISE_PRINCIPLE}</p>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Lender</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Products</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Relationship Score</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const score = relationshipScore(entry.contactCount, entry.productCount);
                const href = buildElwWorkspaceHref(entry.lenderId, {
                  from: "lenders",
                  returnTo: "/lenders",
                });
                const initials = entry.name
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <tr
                    key={entry.lenderRef}
                    className="border-t border-border/70 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <Link href={href} className="flex items-center gap-3 group">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-500/25 bg-violet-500/10 text-[10px] font-bold text-violet-800 dark:text-violet-200">
                          {initials || <Building2 className="h-4 w-4" />}
                        </span>
                        <span>
                          <span className="block font-medium text-foreground group-hover:underline">
                            {entry.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {entry.headquartersCity ?? "Enterprise partner"}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{categoryFor(entry.name)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {productsLabel(entry.productCount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill variant={entry.contactCount > 0 ? "success" : "muted"}>
                        {entry.contactCount > 0 ? "Active" : "Onboarding"}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              score >= 80 ? "bg-emerald-500" : score >= 65 ? "bg-amber-500" : "bg-slate-400",
                            )}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-xs font-medium">{score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 rounded-lg text-xs">
                        <Link href={href}>
                          Open Workspace
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

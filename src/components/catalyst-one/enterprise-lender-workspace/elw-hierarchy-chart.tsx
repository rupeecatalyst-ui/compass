"use client";

import { useState } from "react";
import { Mail, Phone, Plus, UserRound } from "lucide-react";
import { ELW_HIERARCHY_RANKS } from "@/constants/enterprise-lender-workspace";
import type { ElwHierarchyNode, ElwHierarchyRank } from "@/types/enterprise-lender-workspace";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ElwQuickContactPanel } from "./elw-quick-contact-panel";

function accentFor(rank: ElwHierarchyRank): string {
  return ELW_HIERARCHY_RANKS.find((r) => r.rank === rank)?.accent ?? "from-slate-600 to-slate-500";
}

function HierarchyCard({
  node,
  onAssign,
  onOpenContact,
}: {
  node: ElwHierarchyNode;
  onAssign: (rank: ElwHierarchyRank) => void;
  onOpenContact: (contactId: string) => void;
}) {
  const filled = Boolean(node.person);

  return (
    <div
      className={cn(
        "group relative w-[220px] shrink-0 overflow-hidden rounded-2xl border transition-all duration-300",
        "hover:shadow-lg",
        filled
          ? "border-border/70 bg-card shadow-sm"
          : "border-dashed border-border/80 bg-muted/20",
      )}
    >
      <div className={cn("h-1.5 w-full bg-gradient-to-r", accentFor(node.rank))} />
      <div className="space-y-3 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {node.rankLabel}
            </p>
            {filled ? (
              <p className="mt-1 text-sm font-semibold tracking-tight">{node.person!.name}</p>
            ) : (
              <p className="mt-1 text-sm font-medium text-muted-foreground">Vacant</p>
            )}
          </div>
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
              filled
                ? "border-teal-500/30 bg-teal-500/10 text-teal-900 dark:text-teal-100"
                : "border-border bg-muted/40 text-muted-foreground",
            )}
          >
            {filled ? node.person!.photoInitials : <UserRound className="h-4 w-4" />}
          </div>
        </div>

        {filled ? (
          <>
            <div className="space-y-0.5 text-[11px] text-muted-foreground">
              <p>{node.person!.designation}</p>
              {node.person!.phone ? <p>{node.person!.phone}</p> : null}
              {node.person!.email ? <p className="truncate">{node.person!.email}</p> : null}
              {node.person!.territory ? <p>Territory · {node.person!.territory}</p> : null}
              {node.person!.productsHandled?.length ? (
                <p>Products · {node.person!.productsHandled.join(", ")}</p>
              ) : null}
              <p>Direct reports · {node.person!.directReportsCount}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2 text-[10px]"
                disabled={!node.person!.phone}
                onClick={() => {
                  const tel = node.person!.phone?.replace(/\D/g, "");
                  if (tel) window.open(`tel:${tel}`, "_self");
                }}
              >
                <Phone className="h-3 w-3" />
                Call
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2 text-[10px]"
                disabled={!node.person!.email}
                onClick={() => {
                  if (node.person!.email) window.open(`mailto:${node.person!.email}`, "_self");
                }}
              >
                <Mail className="h-3 w-3" />
                Email
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[10px]"
                onClick={() => onOpenContact(node.person!.contactId)}
              >
                Open Contact
              </Button>
            </div>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 w-full gap-1.5 border-dashed text-xs"
            onClick={() => onAssign(node.rank)}
          >
            <Plus className="h-3.5 w-3.5" />
            Assign Contact
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Premium vertical organization chart — highest level first, vacant ranks stay visible.
 */
export function ElwHierarchyChart({
  lenderId,
  nodes,
  onChanged,
}: {
  lenderId: string;
  nodes: ElwHierarchyNode[];
  onChanged: () => void;
}) {
  const [assignRank, setAssignRank] = useState<ElwHierarchyRank | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Relationship Hierarchy</h3>
          <p className="text-xs text-muted-foreground">
            Enterprise org chart · vacant positions remain visible for immediate mapping.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="mx-auto flex min-w-max flex-col items-center gap-0 px-2 py-4">
          {nodes.map((node, index) => (
            <div key={node.id} className="flex flex-col items-center">
              {index > 0 ? (
                <div className="flex flex-col items-center py-1" aria-hidden>
                  <div className="h-6 w-px bg-gradient-to-b from-border to-teal-500/40" />
                  <div className="h-2 w-2 rounded-full bg-teal-600/70 shadow-[0_0_0_3px_rgba(13,148,136,0.15)]" />
                  <div className="h-4 w-px bg-gradient-to-b from-teal-500/40 to-border" />
                </div>
              ) : null}
              <div
                className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both"
                style={{ animationDelay: `${index * 60}ms`, animationDuration: "450ms" }}
              >
                <HierarchyCard
                  node={node}
                  onAssign={setAssignRank}
                  onOpenContact={() => {
                    /* Phase 1 — contact desk wiring arrives with Contact Master deep-link */
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <ElwQuickContactPanel
        open={assignRank !== null}
        onOpenChange={(open) => {
          if (!open) setAssignRank(null);
        }}
        lenderId={lenderId}
        rank={assignRank}
        onSaved={() => {
          setAssignRank(null);
          onChanged();
        }}
      />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronRight, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LoanFile } from "@/types/catalyst-one";
import type { LoanParticipant } from "@/types/loan-participant";
import {
  buildLoanStructureNodes,
  listPropertyOwners,
  totalParticipantCount,
  type LoanStructureNode,
} from "@/lib/loan-structure";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * 🏗 Loan Structure — collapsed summary + expanded relationship map.
 * Clicking a participant card opens Participant Details for editing.
 */
export function LoanStructureCard({
  file,
  participants,
  readOnly,
  onSelectPrimary,
  onSelectParticipant,
  onPrimaryOwnershipChange,
  onParticipantOwnershipChange,
  className,
}: {
  file: LoanFile;
  participants: LoanParticipant[];
  readOnly?: boolean;
  onSelectPrimary: () => void;
  onSelectParticipant: (participantId: string) => void;
  onPrimaryOwnershipChange: (patch: {
    primaryPropertyOwner?: boolean;
    primaryOwnershipPercentage?: number;
  }) => void;
  onParticipantOwnershipChange: (
    participantId: string,
    patch: { isPropertyOwner?: boolean; ownershipPercentage?: number },
  ) => void;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const nodes = useMemo(
    () => buildLoanStructureNodes(file, participants),
    [file, participants],
  );
  const owners = useMemo(() => listPropertyOwners(nodes), [nodes]);
  const count = totalParticipantCount(file, participants);
  const primary = nodes[0];
  const others = nodes.slice(1);

  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-card shadow-sm",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-tight text-foreground">
            <Landmark className="h-3.5 w-3.5 text-teal-700 dark:text-teal-300" aria-hidden />
            Loan Structure
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            Borrower: <span className="font-medium text-foreground">{file.customerName || "—"}</span>
            <span className="mx-1.5 text-border">·</span>
            Participants: <span className="font-semibold tabular-nums text-foreground">{count}</span>
          </p>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded ? (
        <div className="border-t border-border/70 px-3 pb-3 pt-3">
          <p className="mb-2 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Loan
          </p>
          <div className="mx-auto mb-1 h-4 w-px bg-border" aria-hidden />

          {primary ? (
            <StructureNodeCard
              node={primary}
              readOnly={readOnly}
              onClick={onSelectPrimary}
              onOwnershipChange={(patch) =>
                onPrimaryOwnershipChange({
                  primaryPropertyOwner: patch.isPropertyOwner,
                  primaryOwnershipPercentage: patch.ownershipPercentage,
                })
              }
            />
          ) : null}

          {others.length > 0 ? (
            <>
              <div className="mx-auto my-1 h-4 w-px bg-border" aria-hidden />
              <div className="grid gap-2 sm:grid-cols-2">
                {others.map((node) => (
                  <StructureNodeCard
                    key={node.key}
                    node={node}
                    readOnly={readOnly}
                    onClick={() =>
                      node.participantId
                        ? onSelectParticipant(node.participantId)
                        : undefined
                    }
                    onOwnershipChange={(patch) => {
                      if (!node.participantId) return;
                      onParticipantOwnershipChange(node.participantId, patch);
                    }}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              No co-borrowers, guarantors, or companies yet — add them in Participant Details.
            </p>
          )}

          <div className="mt-3 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Building2 className="h-3 w-3" aria-hidden />
              Property Owners
            </p>
            {owners.length > 0 ? (
              <ul className="mt-1.5 space-y-0.5">
                {owners.map((o) => (
                  <li key={`${o.name}-${o.pct}`} className="text-[11px] text-foreground">
                    · {o.name} ({o.pct || "—"}%)
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[11px] text-muted-foreground">
                No property owners flagged yet.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StructureNodeCard({
  node,
  readOnly,
  onClick,
  onOwnershipChange,
}: {
  node: LoanStructureNode;
  readOnly?: boolean;
  onClick?: () => void;
  onOwnershipChange: (patch: {
    isPropertyOwner?: boolean;
    ownershipPercentage?: number;
  }) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "cursor-pointer rounded-lg border border-border/70 bg-background p-2.5 text-left shadow-sm",
        "transition-colors hover:border-teal-500/35 hover:bg-teal-500/[0.03]",
      )}
      style={{ borderLeftWidth: 3, borderLeftColor: node.accent }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">{node.name}</p>
          <p className="mt-0.5 text-[10px] font-medium" style={{ color: node.accent }}>
            {node.roleLabel}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 text-[9px] font-semibold",
            node.kycComplete
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-amber-700 dark:text-amber-300",
          )}
        >
          {node.kycLabel}
        </span>
      </div>

      <p className="mt-1.5 text-[11px] text-muted-foreground">{node.categoryLabel}</p>
      <p className="mt-0.5 text-[11px]">
        <span className="text-muted-foreground">{node.metricLabel}</span>
        <span className="ml-1 font-semibold tabular-nums text-foreground">{node.metricValue}</span>
      </p>

      <div
        className="mt-2 border-t border-border/50 pt-2"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Property Owner?
        </p>
        <div className="mt-1 flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-[11px]">
            <input
              type="radio"
              name={`po-${node.key}`}
              checked={node.isPropertyOwner === true}
              disabled={readOnly}
              onChange={() =>
                onOwnershipChange({
                  isPropertyOwner: true,
                  ownershipPercentage: node.ownershipPercentage ?? 100,
                })
              }
            />
            Yes
          </label>
          <label className="flex items-center gap-1.5 text-[11px]">
            <input
              type="radio"
              name={`po-${node.key}`}
              checked={!node.isPropertyOwner}
              disabled={readOnly}
              onChange={() =>
                onOwnershipChange({
                  isPropertyOwner: false,
                  ownershipPercentage: undefined,
                })
              }
            />
            No
          </label>
        </div>
        {node.isPropertyOwner ? (
          <div className="mt-1.5">
            <Label className="text-[9px] uppercase text-muted-foreground">
              Ownership Percentage (%)
            </Label>
            <Input
              type="number"
              min={1}
              max={100}
              className="mt-1 h-7 w-24 text-xs tabular-nums"
              disabled={readOnly}
              value={node.ownershipPercentage ?? ""}
              onChange={(e) => {
                const n = Number(e.target.value);
                onOwnershipChange({
                  isPropertyOwner: true,
                  ownershipPercentage: Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : undefined,
                });
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

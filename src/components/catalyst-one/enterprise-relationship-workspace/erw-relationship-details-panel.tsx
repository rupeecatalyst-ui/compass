"use client";

import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  erwColourToken,
  erwEntityTypeLabel,
  erwStatusLabel,
} from "@/lib/enterprise-relationship-workspace";
import { cn } from "@/lib/utils";
import type { ErwGraphNode } from "@/types/enterprise-relationship-workspace";

export interface ErwRelationshipDetailsPanelProps {
  node: ErwGraphNode | null;
  onNavigateLinked?: (href: string) => void;
  className?: string;
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 text-[11px]">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium text-zinc-200">{value}</dd>
    </div>
  );
}

export function ErwRelationshipDetailsPanel({
  node,
  onNavigateLinked,
  className,
}: ErwRelationshipDetailsPanelProps) {
  const router = useRouter();

  if (!node) {
    return (
      <aside
        className={cn(
          "flex h-full min-h-[280px] flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-3",
          className,
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Relationship Details
        </p>
        <p className="mt-6 text-sm text-zinc-500">
          Select a node in the network to inspect relationship context.
        </p>
      </aside>
    );
  }

  const tone = erwColourToken(node.colourFamily);

  return (
    <aside
      className={cn(
        "flex h-full min-h-[280px] flex-col rounded-xl border border-zinc-800 bg-zinc-900/60 p-3",
        className,
      )}
    >
      <div className="mb-3 border-b border-zinc-800 pb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Relationship Details
        </p>
        <h3 className="mt-1 text-base font-semibold tracking-tight text-zinc-50">{node.name}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className="inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium"
            style={{ borderColor: tone.ring, color: tone.text, background: tone.soft }}
          >
            {node.relationshipTypeLabel}
          </span>
          <span className="inline-flex rounded-full border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-[10px] text-zinc-300">
            {erwEntityTypeLabel(node.entityType)}
          </span>
          <span
            className={cn(
              "inline-flex rounded-full border px-2 py-0.5 text-[10px]",
              node.status === "active"
                ? "border-teal-800 bg-teal-950/50 text-teal-300"
                : node.status === "pending_verification"
                  ? "border-amber-800 bg-amber-950/40 text-amber-200"
                  : "border-zinc-700 text-zinc-400",
            )}
          >
            {erwStatusLabel(node.status)}
          </span>
          {node.isIllustrative && (
            <span className="inline-flex rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-500">
              Preview
            </span>
          )}
        </div>
      </div>

      <dl className="space-y-1.5">
        <DetailRow label="Relationship Type" value={node.relationshipTypeLabel} />
        <DetailRow label="Designation" value={node.detail.designation} />
        <DetailRow label="Ownership %" value={node.detail.ownershipPct} />
        <DetailRow label="PAN" value={node.detail.pan} />
        <DetailRow label="GSTIN" value={node.detail.gstin} />
        <DetailRow label="ROC / CIN" value={node.detail.roc} />
        <DetailRow label="Date Since" value={node.detail.dateSince} />
        <DetailRow label="Mobile" value={node.detail.mobile} />
        <DetailRow label="Email" value={node.detail.email} />
        <DetailRow label="Location" value={node.detail.location} />
        <DetailRow label="Notes" value={node.detail.notes} />
        <DetailRow label="Status" value={erwStatusLabel(node.status)} />
      </dl>

      <div className="mt-4 border-t border-zinc-800 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          Linked Records
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {node.linkedRecords.map((rec) => (
            <button
              key={rec.kind}
              type="button"
              className={cn(
                "rounded-lg border border-zinc-800 bg-zinc-950/80 px-2.5 py-2 text-left transition",
                "hover:border-teal-700 hover:bg-teal-950/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-500",
              )}
              onClick={() => {
                if (!rec.href) return;
                if (onNavigateLinked) onNavigateLinked(rec.href);
                else router.push(rec.href);
              }}
            >
              <p className="text-[10px] text-zinc-500">{rec.label}</p>
              <p className="text-sm font-semibold tabular-nums text-zinc-100">{rec.count}</p>
            </button>
          ))}
        </div>
      </div>

      {node.navigateWorkspace && !node.isCentre && (
        <div className="mt-auto pt-3">
          <Button
            type="button"
            size="sm"
            className="h-8 w-full gap-1.5 rounded-lg bg-teal-700 text-xs hover:bg-teal-600"
            onClick={() => {
              const href =
                node.navigateHref ||
                (node.navigateWorkspace === "opportunity"
                  ? "/opportunities"
                  : node.navigateWorkspace === "loan"
                    ? "/my-deals"
                    : node.navigateWorkspace === "company"
                      ? "/contacts"
                      : node.navigateWorkspace === "lender"
                        ? "/lenders"
                        : "/contacts");
              if (onNavigateLinked) onNavigateLinked(href);
              else router.push(href);
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open {node.navigateWorkspace === "company" ? "Company" : "Workspace"}
          </Button>
        </div>
      )}
    </aside>
  );
}

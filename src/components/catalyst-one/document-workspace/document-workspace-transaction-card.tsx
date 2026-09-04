"use client";

/**
 * CO-C1-DOCUMENT-WORKSPACE-CARD-GRID-012
 * One Opportunity card with nested lender Deals. Canonical IDs only.
 */

import { LenderLogo } from "@/components/catalyst-one/shared/lender-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DOCUMENT_WORKSPACE_CARD_GRID_OPEN_DEAL_LABEL,
  DOCUMENT_WORKSPACE_CARD_GRID_OPEN_LABEL,
  DOCUMENT_WORKSPACE_CARD_GRID_READINESS_UNAVAILABLE,
} from "@/constants/document-workspace-card-grid";
import { cn } from "@/lib/utils";
import type {
  DocumentWorkspaceCardGroup,
  DocumentWorkspaceCardReadiness,
  DocumentWorkspaceDealCard,
  DocumentWorkspaceOpportunityCard,
} from "@/types/document-workspace-card-grid";

function formatCardDate(iso: string | null | undefined): string {
  if (!iso) return "Not available";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "Not available";
  return new Date(t).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ReadinessMeter({ readiness }: { readiness: DocumentWorkspaceCardReadiness }) {
  if (!readiness.available) {
    return (
      <div data-readiness="unavailable" className="space-y-1">
        <p className="text-[11px] text-muted-foreground">
          Documents · {DOCUMENT_WORKSPACE_CARD_GRID_READINESS_UNAVAILABLE}
        </p>
        <div className="h-1.5 rounded-full bg-white/10" aria-hidden />
      </div>
    );
  }
  return (
    <div data-readiness="available" className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground">Documents</span>
        <span className="font-medium tabular-nums text-foreground">{readiness.percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <div
          className="h-full rounded-full bg-teal-400/80"
          style={{ width: `${Math.max(0, Math.min(100, readiness.percent))}%` }}
        />
      </div>
      <p className="text-[10px] leading-snug text-muted-foreground">
        Required {readiness.required} · Received {readiness.received} · Accepted {readiness.accepted}
        {" · "}Pending {readiness.pending}
        {readiness.rejected ? ` · Rejected ${readiness.rejected}` : ""}
        {readiness.expired ? ` · Expired ${readiness.expired}` : ""}
      </p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate text-foreground" title={value}>
        {value || "Not available"}
      </dd>
    </div>
  );
}

export function DocumentWorkspaceTransactionCardView({
  group,
  readiness,
  onOpenOpportunity,
  onOpenDeal,
}: {
  group: DocumentWorkspaceCardGroup;
  readiness: DocumentWorkspaceCardReadiness;
  onOpenOpportunity: (card: DocumentWorkspaceOpportunityCard) => void;
  onOpenDeal: (card: DocumentWorkspaceDealCard) => void;
}) {
  const card = group.opportunity;
  const dealCount = group.deals.length;
  const identity = `${card.borrowerName}, ${card.opportunityNumber}`;

  return (
    <article
      data-transaction-card-key={card.key}
      data-card-kind="opportunity"
      data-opportunity-id={card.opportunityId}
      data-opportunity-group={card.opportunityId}
      aria-label={`Opportunity ${identity}`}
      className={cn(
        "flex h-full min-w-0 flex-col gap-3 rounded-xl border border-teal-500/20 bg-[#0b1220] p-4",
        "shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Badge
          data-card-badge="opportunity"
          className="border border-teal-400/40 bg-teal-500/15 px-2 py-0 text-[10px] font-semibold uppercase tracking-wide text-teal-200"
        >
          Opportunity
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {dealCount} lender Deal{dealCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="min-w-0 space-y-1">
        <h2
          data-borrower-heading=""
          className="line-clamp-2 break-words text-xl font-semibold leading-tight tracking-tight text-foreground"
        >
          {card.borrowerName}
        </h2>
        <p data-record-number="" className="truncate text-xs text-muted-foreground">
          {card.opportunityNumber}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        <Detail label="Product" value={card.product} />
        <Detail label="Requested amount" value={card.amountLabel} />
        <Detail label="Stage" value={card.stage} />
        <Detail label="Assigned RC" value={card.assignedRc} />
        <Detail label="Created" value={formatCardDate(card.createdAt)} />
        <Detail label="Last activity" value={formatCardDate(card.updatedAt)} />
      </dl>

      <ReadinessMeter readiness={readiness} />

      <Button
        type="button"
        data-open-opportunity=""
        className="mt-auto h-8 w-full bg-teal-500/15 text-xs font-medium text-teal-100 hover:bg-teal-500/25 focus-visible:ring-2 focus-visible:ring-teal-400/60"
        aria-label={`${DOCUMENT_WORKSPACE_CARD_GRID_OPEN_LABEL} for ${identity}`}
        onClick={() => onOpenOpportunity(card)}
      >
        {DOCUMENT_WORKSPACE_CARD_GRID_OPEN_LABEL}
      </Button>

      {dealCount > 0 ? (
        <div data-lender-deals="" className="space-y-1.5 border-t border-white/10 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Lender Deals
          </p>
          <ul
            className={cn(
              "space-y-1.5",
              dealCount > 4 ? "max-h-40 overflow-y-auto pr-1" : "",
            )}
          >
            {group.deals.map((deal) => (
              <li
                key={deal.key}
                data-deal-row={deal.dealId}
                data-deal-id={deal.dealId}
                data-opportunity-id={deal.opportunityId}
                className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-2.5 py-2"
              >
                <div className="flex items-start gap-2">
                  <LenderLogo lender={deal.lenderName} seedKey={deal.lenderId} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p data-lender-secondary="" className="truncate text-sm text-foreground">
                      {deal.lenderName}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {deal.dealNumber}
                      {deal.stage ? ` · ${deal.stage}` : ""}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  data-open-deal=""
                  className="mt-2 h-7 w-full text-[11px] focus-visible:ring-2 focus-visible:ring-teal-400/60"
                  aria-label={`${DOCUMENT_WORKSPACE_CARD_GRID_OPEN_DEAL_LABEL} for ${deal.lenderName}, ${deal.dealNumber}`}
                  onClick={() => onOpenDeal(deal)}
                >
                  {DOCUMENT_WORKSPACE_CARD_GRID_OPEN_DEAL_LABEL}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

export function DocumentWorkspaceCardGridSkeleton({ compact = false }: { compact?: boolean }) {
  const count = compact ? 3 : 6;
  return (
    <div
      data-card-grid-skeleton=""
      className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-xl border border-white/10 bg-[#0b1220] p-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-3 h-7 w-3/4" />
          <Skeleton className="mt-2 h-3 w-1/2" />
          <Skeleton className="mt-4 h-16 w-full" />
          <Skeleton className="mt-3 h-2 w-full" />
        </div>
      ))}
    </div>
  );
}

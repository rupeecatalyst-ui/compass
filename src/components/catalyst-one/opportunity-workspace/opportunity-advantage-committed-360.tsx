"use client";

import { ADVANTAGE_COMMITTED_LABEL } from "@/constants/advantage-committed";
import { canViewAdvantageCommittedHistory } from "@/lib/advantage-committed";
import { AdvantageCommittedReadout } from "@/components/catalyst-one/shared/advantage-committed-readout";
import type { AdvantageCommittedHistoryEvent } from "@/types/advantage-committed";

export function OpportunityAdvantageCommitted360({
  amount,
  productCode,
  productLabel,
  committedProductCode,
  display,
  status,
  campaignName,
  marketingSource,
  committedAt,
  committedByUserId,
  history,
  viewerRole,
}: {
  amount?: unknown;
  productCode?: string | null;
  productLabel?: string | null;
  committedProductCode?: string | null;
  display?: string | null;
  status?: string | null;
  campaignName?: string | null;
  marketingSource?: string | null;
  committedAt?: string | null;
  committedByUserId?: string | null;
  history?: AdvantageCommittedHistoryEvent[];
  viewerRole?: string | null;
}) {
  const showHistory = canViewAdvantageCommittedHistory(viewerRole) && (history?.length ?? 0) > 0;
  return (
    <section
      className="rounded-xl border border-border bg-card p-4"
      data-surface="opportunity-360-advantage-committed"
    >
      <h3 className="text-sm font-semibold text-foreground">{ADVANTAGE_COMMITTED_LABEL}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <AdvantageCommittedReadout
          amount={amount}
          productCode={productCode}
          productLabel={productLabel}
          committedProductCode={committedProductCode}
          display={display}
        />
        <div>
          <p className="text-[11px] text-muted-foreground">Commitment status</p>
          <p className="text-sm font-medium capitalize">{(status || "not_applicable").replace(/_/g, " ")}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Campaign name</p>
          <p className="text-sm">{campaignName?.trim() || "Not Specified"}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Marketing source</p>
          <p className="text-sm">{marketingSource?.trim() || "Not Specified"}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Committed date</p>
          <p className="text-sm">
            {committedAt ? new Date(committedAt).toLocaleString("en-IN") : "Not committed"}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Committed by</p>
          <p className="text-sm">{committedByUserId?.trim() || "Not Specified"}</p>
        </div>
      </div>
      {showHistory ? (
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-foreground">Correction history</h4>
          <ul className="mt-2 space-y-1.5 text-xs">
            {history!.map((event) => (
              <li key={event.id} className="rounded-md border border-border/70 px-2 py-1.5">
                <p className="font-medium capitalize">{event.eventKind.replace(/_/g, " ")}</p>
                <p className="tabular-nums text-muted-foreground">
                  {event.previousAmount ? `${event.previousAmount} → ` : ""}
                  {event.amount}
                  {event.reason ? ` · ${event.reason}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

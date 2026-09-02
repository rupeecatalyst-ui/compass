"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import { displayOpportunityAmount, displayOpportunityText } from "@/lib/lead-opportunity-journey/opportunity-field-display";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

type SwitcherHit = {
  opportunityId: string;
  label: string;
  meta: string;
  dealId?: string;
};

export function DocumentWorkspaceSwitcher({
  onSelect,
  compact = false,
}: {
  onSelect: (opportunityId: string) => void;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SwitcherHit[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = query.trim();
    const handle = window.setTimeout(() => {
      void (async () => {
        setBusy(true);
        try {
          const page = await enterpriseOpportunityApiClient.searchOpportunities({
            q: q || undefined,
            limit: 12,
            offset: 0,
          });
          const rows: SwitcherHit[] = [];
          for (const item of page.items) {
            rows.push({
              opportunityId: item.id,
              label: displayOpportunityText(item.primaryContactName),
              meta: [
                item.opportunityNumber,
                displayOpportunityText(item.productLabel),
                displayOpportunityAmount(item.requestedAmount, {
                  captured: item.requirementCaptured,
                }),
              ].join(" · "),
            });
            if (!compact && q && rows.length < 16) {
              try {
                const deals = await enterpriseDealApiClient.listDealsByOpportunity(item.id);
                for (const deal of deals.items.slice(0, 3)) {
                  rows.push({
                    opportunityId: item.id,
                    dealId: deal.id,
                    label: `${deal.primaryCounterpartyName || "Deal"} · ${deal.dealNumber}`,
                    meta: item.opportunityNumber,
                  });
                }
              } catch {
                /* deal search is additive */
              }
            }
          }
          setHits(rows);
        } catch {
          setHits([]);
        } finally {
          setBusy(false);
        }
      })();
    }, q ? 280 : 0);
    return () => window.clearTimeout(handle);
  }, [query, compact]);

  const visible = useMemo(() => hits.slice(0, 16), [hits]);

  return (
    <div className={cn("w-full space-y-3", compact ? "max-w-md space-y-1" : "mx-auto max-w-2xl")}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customer, Opportunity or Deal"
          className="h-10 pl-9"
          aria-label="Search transactions"
        />
      </div>
      {compact ? null : (
      <p className="text-[11px] text-muted-foreground">
        {busy ? "Searching Enterprise Registries…" : "Select a transaction to open Document Workspace."}
      </p>
      )}
      <ul className={cn("overflow-y-auto rounded-lg border border-border/70 bg-background", compact ? "max-h-48" : "max-h-80")}>
        {visible.map((hit) => (
          <li key={`${hit.opportunityId}:${hit.dealId || "opp"}`}>
            <Button
              type="button"
              variant="ghost"
              className={cn("h-auto w-full justify-start rounded-none px-3 py-2 text-left")}
              onClick={() => onSelect(hit.opportunityId)}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{hit.label}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{hit.meta}</span>
              </span>
            </Button>
          </li>
        ))}
        {!busy && visible.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">
            No matching Opportunity found.
          </li>
        ) : null}
      </ul>
      {compact ? null : (
      <p className="text-[10px] text-muted-foreground">
        Journey Documents remain at {ROUTES.DOCUMENT_CENTER}. This desk does not reopen Lead / Credit / LIFE.
      </p>
      )}
    </div>
  );
}

"use client";

/**
 * CO-C1-CONTEXT-LOCKED-DOCUMENT-WORKSPACE-008
 * Explicit transaction switcher. Selection writes canonical IDs only.
 */

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import { displayOpportunityAmount, displayOpportunityText } from "@/lib/lead-opportunity-journey/opportunity-field-display";
import { ROUTES } from "@/constants/routes";
import { isCanonicalDocumentWorkspaceId } from "@/lib/document-workspace/context-lock";
import type { DocumentWorkspaceContextInput } from "@/types/document-workspace-context";
import { cn } from "@/lib/utils";

type SwitcherHit = {
  kind: "opportunity" | "deal";
  opportunityId: string;
  dealId?: string;
  contactId?: string | null;
  companyId?: string | null;
  label: string;
  meta: string;
};

export function DocumentWorkspaceSwitcher({
  onSelect,
  compact = false,
}: {
  onSelect: (input: DocumentWorkspaceContextInput) => void;
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
            if (!isCanonicalDocumentWorkspaceId(item.id)) continue;
            rows.push({
              kind: "opportunity",
              opportunityId: item.id,
              contactId: item.primaryContactId,
              companyId: item.companyId,
              label: `Opportunity · ${item.opportunityNumber}`,
              meta: [
                displayOpportunityText(item.primaryContactName || item.companyName),
                displayOpportunityText(item.productLabel),
                displayOpportunityAmount(item.requestedAmount, {
                  captured: item.requirementCaptured,
                }),
              ]
                .filter(Boolean)
                .join(" · "),
            });
            try {
              const deals = await enterpriseDealApiClient.listDealsByOpportunity(item.id);
              for (const deal of deals.items) {
                if (!isCanonicalDocumentWorkspaceId(deal.id)) continue;
                rows.push({
                  kind: "deal",
                  opportunityId: item.id,
                  dealId: deal.id,
                  contactId: deal.primaryContactId || item.primaryContactId,
                  companyId: deal.companyId || item.companyId,
                  label: `Deal · ${deal.dealNumber}`,
                  meta: [
                    deal.primaryCounterpartyName || "Lender",
                    item.opportunityNumber,
                    displayOpportunityText(deal.productLabel || item.productLabel),
                  ]
                    .filter(Boolean)
                    .join(" · "),
                });
              }
            } catch {
              /* deal search is additive */
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
  }, [query]);

  const visible = useMemo(() => hits.slice(0, 20), [hits]);

  return (
    <div className={cn("w-full space-y-3", compact ? "max-w-xl space-y-1" : "mx-auto max-w-2xl")}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search authorised customer, Opportunity or Deal"
          className="h-10 pl-9"
          aria-label="Search transactions"
        />
      </div>
      {compact ? null : (
        <p className="text-[11px] text-muted-foreground">
          {busy
            ? "Searching authorised registries…"
            : "Select an Opportunity or a lender Deal. Context never changes from names, mobile, or email."}
        </p>
      )}
      <ul
        className={cn(
          "overflow-y-auto rounded-lg border border-border/70 bg-background",
          compact ? "max-h-56" : "max-h-80",
        )}
      >
        {visible.map((hit) => (
          <li key={`${hit.kind}:${hit.opportunityId}:${hit.dealId || "opp"}`}>
            <Button
              type="button"
              variant="ghost"
              className="h-auto w-full justify-start rounded-none px-3 py-2 text-left"
              onClick={() =>
                onSelect({
                  opportunityId: hit.opportunityId,
                  dealId: hit.dealId || null,
                  contactId: hit.contactId || null,
                  companyId: hit.companyId || null,
                })
              }
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{hit.label}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {hit.kind === "deal" ? "Lender Deal · " : "Opportunity · "}
                  {hit.meta}
                </span>
              </span>
            </Button>
          </li>
        ))}
        {!busy && visible.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">
            No authorised Opportunity or Deal found.
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

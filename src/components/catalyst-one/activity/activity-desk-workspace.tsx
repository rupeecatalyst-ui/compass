"use client";

/**
 * Activity & Dialogue desk — unified EAR chronology (global + entity-scoped).
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, History, Loader2, Search, Target } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { TransactionActivityTimeline } from "@/components/catalyst-one/transaction-activity-timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/routes";
import {
  setActiveOpportunityContext,
} from "@/lib/lead-opportunity-journey/active-context";
import { rememberOpportunityRegistryContext } from "@/lib/lead-opportunity-journey/opportunity-context";
import {
  enterpriseOpportunityApiClient,
  type EnterpriseOpportunityApiRecord,
} from "@/lib/enterprise-opportunity/opportunity-api-client";
import {
  enterpriseDealApiClient,
  type EnterpriseDealApiRecord,
} from "@/lib/enterprise-deal/deal-api-client";
import { borrowerDisplayNameOrDash, resolveDealBorrowerIdentity } from "@/lib/enterprise-borrower-identity";
import { cn } from "@/lib/utils";

type PickerKind = "opportunity" | "deal";

function activityHref(input: {
  opportunityId?: string | null;
  dealId?: string | null;
  inboundEmailId?: string | null;
}): string {
  const params = new URLSearchParams();
  if (input.opportunityId) params.set("opportunityId", input.opportunityId);
  if (input.dealId) params.set("dealId", input.dealId);
  if (input.inboundEmailId) params.set("inboundEmailId", input.inboundEmailId);
  const q = params.toString();
  return q ? `${ROUTES.ACTIVITY}?${q}` : ROUTES.ACTIVITY;
}

export function ActivityDeskWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const opportunityIdParam = searchParams.get("opportunityId")?.trim() || "";
  const dealIdParam = searchParams.get("dealId")?.trim() || "";
  const inboundEmailId = searchParams.get("inboundEmailId")?.trim() || "";
  const showEntityFilter = searchParams.get("filter") === "entity";
  const hasUrlContext = Boolean(opportunityIdParam || dealIdParam);

  const [pickingEntity, setPickingEntity] = useState(false);

  if (pickingEntity || (showEntityFilter && !hasUrlContext)) {
    return (
      <ActivityEntityPicker
        onCancel={() => {
          setPickingEntity(false);
          router.replace(ROUTES.ACTIVITY);
        }}
        onSelectOpportunity={(opportunity) => {
          rememberOpportunityRegistryContext(opportunity);
          setPickingEntity(false);
          router.replace(
            activityHref({
              opportunityId: opportunity.id,
              inboundEmailId: inboundEmailId || null,
            }),
          );
        }}
        onSelectDeal={(deal) => {
          if (deal.opportunityId) {
            setActiveOpportunityContext({
              opportunityId: deal.opportunityId,
              fileId: deal.id,
              customer:
                deal.primaryContactName || deal.companyName || undefined,
              product: deal.productLabel || undefined,
              opportunityReference: deal.opportunityNumber || undefined,
            });
          }
          setPickingEntity(false);
          router.replace(
            activityHref({
              dealId: deal.id,
              opportunityId: deal.opportunityId ?? null,
              inboundEmailId: inboundEmailId || null,
            }),
          );
        }}
      />
    );
  }

  const dealId = dealIdParam || undefined;
  const opportunityId = opportunityIdParam || undefined;
  const isGlobal = !dealId && !opportunityId;

  return (
    <div className="space-y-6" data-activity-desk="" data-activity-dialogue="">
      <PageHeader
        title="Activity & Dialogue"
        description="One chronological communication stream — email, calls, notes, and transaction events. Source: Enterprise Activity Registry."
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {dealId
            ? "Deal-scoped history (parent Opportunity events without a sibling Deal id are included)."
            : opportunityId
              ? "Opportunity-scoped history."
              : "Organization-wide Activity & Dialogue — newest first."}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {!isGlobal ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => router.push(ROUTES.ACTIVITY)}
            >
              All activity
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setPickingEntity(true)}
          >
            {isGlobal ? "Filter by Opportunity / Deal" : "Change"}
          </Button>
        </div>
      </div>
      {dealId ? (
        <TransactionActivityTimeline
          scope={{
            mode: "deal",
            dealId,
            opportunityId: opportunityId || null,
          }}
          notesContext={{
            workspaceKind: "deal",
            entityKind: "deal",
            entityId: dealId,
            dealId,
            opportunityId: opportunityId || null,
          }}
          title="Deal — Activity & Dialogue"
          description="This Deal plus shared Opportunity events. Sibling lender deals are excluded."
          focusInboundEmailId={inboundEmailId || null}
        />
      ) : opportunityId ? (
        <TransactionActivityTimeline
          scope={{ mode: "opportunity", opportunityId }}
          notesContext={{
            workspaceKind: "opportunity",
            entityKind: "opportunity",
            entityId: opportunityId,
            opportunityId,
            contactId: null,
          }}
          title="Opportunity — Activity & Dialogue"
          description="Notes, communications, documents, tasks, and stage events for this Opportunity."
          focusInboundEmailId={inboundEmailId || null}
        />
      ) : (
        <TransactionActivityTimeline
          scope={{ mode: "global" }}
          title="Activity & Dialogue"
          description="Newest communications and operational events across Catalyst One."
          focusInboundEmailId={inboundEmailId || null}
        />
      )}
    </div>
  );
}

function ActivityEntityPicker({
  onSelectOpportunity,
  onSelectDeal,
  onCancel,
}: {
  onSelectOpportunity: (opportunity: EnterpriseOpportunityApiRecord) => void;
  onSelectDeal: (deal: EnterpriseDealApiRecord) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<PickerKind>("opportunity");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<EnterpriseOpportunityApiRecord[]>([]);
  const [deals, setDeals] = useState<EnterpriseDealApiRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const load =
      kind === "opportunity"
        ? enterpriseOpportunityApiClient
            .searchOpportunities({ limit: 100, offset: 0 })
            .then((page) => {
              if (!cancelled) setOpportunities(page.items ?? []);
            })
        : enterpriseDealApiClient
            .searchDeals({ archived: false, view: "summary", pageSize: 80 })
            .then((page) => {
              if (!cancelled) setDeals(page.items ?? []);
            });
    void load
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load registry");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const filteredOpportunities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return opportunities;
    return opportunities.filter((o) =>
      [
        o.opportunityNumber,
        o.companyName,
        o.primaryContactName,
        o.productLabel,
        o.productFamily,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [opportunities, query]);

  const filteredDeals = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return deals;
    return deals.filter((d) =>
      [
        d.dealNumber,
        d.primaryContactName,
        d.companyName,
        d.primaryCounterpartyName,
        d.productLabel,
        d.opportunityNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [deals, query]);

  return (
    <div
      className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4"
      data-activity-entity-picker=""
    >
      <div className="w-full max-w-xl rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-300">
            <History className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Activity & Dialogue
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
              Filter by Opportunity or Deal
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Optional filter for one transaction. The global stream remains available without a
              selection.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={kind === "opportunity" ? "default" : "outline"}
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              setKind("opportunity");
              setQuery("");
            }}
          >
            <Target className="h-3.5 w-3.5" aria-hidden />
            Opportunity
          </Button>
          <Button
            type="button"
            size="sm"
            variant={kind === "deal" ? "default" : "outline"}
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              setKind("deal");
              setQuery("");
            }}
          >
            <Briefcase className="h-3.5 w-3.5" aria-hidden />
            Deal
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ml-auto h-8 text-xs"
            onClick={onCancel}
          >
            Show all
          </Button>
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              kind === "opportunity"
                ? "Search opportunity, customer, product…"
                : "Search deal, customer, lender…"
            }
            className="h-9 pl-8 text-sm"
          />
        </div>

        <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto overscroll-contain pr-1 sm:max-h-[min(320px,42vh)]">
          {loading ? (
            <li className="flex items-center justify-center gap-2 px-3 py-8 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading…
            </li>
          ) : error ? (
            <li className="rounded-lg border border-destructive/40 px-3 py-6 text-center text-xs text-destructive">
              {error}
            </li>
          ) : kind === "opportunity" ? (
            filteredOpportunities.length === 0 ? (
              <li className="rounded-lg border border-dashed border-border/70 px-3 py-8 text-center text-xs text-muted-foreground">
                No Opportunities in the Registry.
              </li>
            ) : (
              filteredOpportunities.map((opportunity) => {
                const borrowerLabel = borrowerDisplayNameOrDash(opportunity);
                return (
                  <li key={opportunity.id}>
                    <button
                      type="button"
                      onClick={() => onSelectOpportunity(opportunity)}
                      className={cn(
                        "flex w-full flex-col gap-0.5 rounded-xl border border-border/60 bg-muted/15 px-3 py-2.5 text-left",
                        "transition-colors hover:border-teal-500/40 hover:bg-teal-500/5",
                      )}
                    >
                      <span className="truncate text-sm font-semibold text-foreground">
                        {borrowerLabel === "—" ? "Opportunity" : borrowerLabel}
                      </span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {opportunity.opportunityNumber}
                        {opportunity.productLabel ? ` · ${opportunity.productLabel}` : ""}
                      </span>
                    </button>
                  </li>
                );
              })
            )
          ) : filteredDeals.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border/70 px-3 py-8 text-center text-xs text-muted-foreground">
              No Deals in the Registry.
            </li>
          ) : (
            filteredDeals.map((deal) => {
              const borrower = resolveDealBorrowerIdentity(deal);
              return (
                <li key={deal.id}>
                  <button
                    type="button"
                    onClick={() => onSelectDeal(deal)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 rounded-xl border border-border/60 bg-muted/15 px-3 py-2.5 text-left",
                      "transition-colors hover:border-teal-500/40 hover:bg-teal-500/5",
                    )}
                  >
                    <span className="truncate text-sm font-semibold text-foreground">
                      {borrower.displayName || deal.dealNumber}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {deal.dealNumber}
                      {deal.primaryCounterpartyName ? ` · ${deal.primaryCounterpartyName}` : ""}
                      {deal.productLabel ? ` · ${deal.productLabel}` : ""}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}

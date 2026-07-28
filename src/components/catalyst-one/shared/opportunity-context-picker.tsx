"use client";

/**
 * Opportunity selection for Opportunity Workspace stages.
 * SSOT: Enterprise Opportunity Registry (same source as My Opportunities).
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Loader2, Search } from "lucide-react";
import { formatINR } from "@/lib/format-currency";
import { ROUTES } from "@/constants/routes";
import { buildJourneyHref } from "@/constants/lead-opportunity-journey";
import { rememberOpportunityRegistryContext } from "@/lib/lead-opportunity-journey/opportunity-context";
import {
  enterpriseOpportunityApiClient,
  type EnterpriseOpportunityApiRecord,
} from "@/lib/enterprise-opportunity/opportunity-api-client";
import {
  notifyOpportunitiesUpdated,
  subscribeOpportunitiesUpdated,
} from "@/lib/enterprise-opportunity/opportunity-data-sync";
import { borrowerDisplayNameOrDash } from "@/lib/enterprise-borrower-identity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function humanize(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  return value.trim().replace(/_/g, " ");
}

/**
 * Shown when a Lead Stage workspace opens from left nav without an active Opportunity.
 * Selecting a case writes Active Opportunity Context and navigates with Registry ids.
 */
export function OpportunityContextPicker({
  targetHref,
  title = "Select an active opportunity",
  description = "Opened from main navigation with no active Opportunity — pick a case to begin. Context is preserved across Opportunity Workspace stages.",
}: {
  targetHref: string;
  title?: string;
  description?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<EnterpriseOpportunityApiRecord[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => subscribeOpportunitiesUpdated(() => setTick((v) => v + 1)), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void enterpriseOpportunityApiClient
      .searchOpportunities({ limit: 100, offset: 0 })
      .then((page) => {
        if (!cancelled) setRows(page.items ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setRows([]);
          setError(err instanceof Error ? err.message : "Failed to load Opportunities");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((o) => {
      const hay = [
        o.opportunityNumber,
        o.companyName,
        o.primaryContactName,
        o.productLabel,
        o.productFamily,
        o.requirementStage,
        o.lifecycleStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  const select = (opportunity: EnterpriseOpportunityApiRecord) => {
    rememberOpportunityRegistryContext(opportunity);
    router.replace(
      buildJourneyHref(targetHref, {
        fileId: opportunity.legacyLoanFileId ?? null,
        opportunityId: opportunity.id,
      }),
    );
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-300">
            <BriefcaseBusiness className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Opportunity Registry
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search opportunity, customer, product…"
            className="h-9 pl-8 text-sm"
          />
        </div>

        <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto overscroll-contain pr-1 sm:max-h-[min(320px,42vh)]">
          {loading ? (
            <li className="flex items-center justify-center gap-2 px-3 py-8 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading Opportunities…
            </li>
          ) : error ? (
            <li className="rounded-lg border border-destructive/40 px-3 py-6 text-center text-xs text-destructive">
              {error}
              <div className="mt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => notifyOpportunitiesUpdated()}
                >
                  Retry
                </Button>
              </div>
            </li>
          ) : filtered.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border/70 px-3 py-8 text-center text-xs text-muted-foreground">
              No Opportunities in the Registry. Start a Loan Journey from Contact, then return
              here.
            </li>
          ) : (
            filtered.map((opportunity) => {
              const borrowerLabel = borrowerDisplayNameOrDash(opportunity);
              return (
              <li key={opportunity.id}>
                <button
                  type="button"
                  onClick={() => select(opportunity)}
                  className="flex w-full flex-col gap-0.5 rounded-xl border border-border/60 bg-muted/15 px-3 py-2.5 text-left transition-colors hover:border-teal-500/40 hover:bg-teal-500/5"
                >
                  <span className="truncate text-sm font-semibold text-foreground">
                    {borrowerLabel === "—" ? "Opportunity" : borrowerLabel}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {opportunity.opportunityNumber}
                    {" · "}
                    {opportunity.productLabel?.trim() ||
                      humanize(opportunity.productFamily)}
                    {opportunity.requestedAmount != null
                      ? ` · ${formatINR(opportunity.requestedAmount)}`
                      : ""}
                    {" · "}
                    {humanize(opportunity.requirementStage)}
                  </span>
                </button>
              </li>
              );
            })
          )}
        </ul>

        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => router.push(ROUTES.MY_OPPORTUNITIES)}
          >
            Open My Opportunities
          </Button>
        </div>
      </div>
    </div>
  );
}

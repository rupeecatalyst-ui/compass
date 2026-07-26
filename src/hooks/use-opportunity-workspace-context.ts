"use client";

/**
 * Shared Opportunity Workspace Context resolver.
 * Stages must consume this — not independently pick LoanFiles.
 */

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getActiveOpportunityContext,
  isDashboardNavEntry,
  type ActiveOpportunityContext,
} from "@/lib/lead-opportunity-journey/active-context";
import {
  opportunityContextFromRegistry,
  rememberOpportunityRegistryContext,
} from "@/lib/lead-opportunity-journey/opportunity-context";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";

export type OpportunityWorkspaceContextState = {
  loading: boolean;
  error: string | null;
  /** Shared context — null only when selection screen is appropriate. */
  context: ActiveOpportunityContext | null;
  /** True when left-nav dashboard entry or no active Opportunity. */
  needsSelection: boolean;
  refresh: () => void;
};

/**
 * Resolve the single active Opportunity for Opportunity Workspace stages.
 * Priority: URL opportunityId → session active context → (selection required).
 */
export function useOpportunityWorkspaceContext(): OpportunityWorkspaceContextState {
  const searchParams = useSearchParams();
  const opportunityIdParam = searchParams.get("opportunityId")?.trim() || null;
  const dashboardEntry = isDashboardNavEntry(searchParams);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<ActiveOpportunityContext | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (dashboardEntry) {
      setContext(null);
      setError(null);
      setLoading(false);
      return;
    }

    const session = getActiveOpportunityContext();
    const opportunityId = opportunityIdParam || session?.opportunityId || null;

    if (!opportunityId) {
      setContext(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void enterpriseOpportunityApiClient
      .getOpportunity(opportunityId)
      .then((row) => {
        if (cancelled) return;
        const next = rememberOpportunityRegistryContext(row);
        setContext(next);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Fall back to session snapshot if Registry fetch fails mid-journey.
        if (session?.opportunityId === opportunityId) {
          setContext(session);
          setError(null);
        } else {
          setContext(null);
          setError(err instanceof Error ? err.message : "Failed to load Opportunity");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dashboardEntry, opportunityIdParam, tick]);

  const needsSelection =
    dashboardEntry || (!loading && !context?.opportunityId && !opportunityIdParam);

  return {
    loading,
    error,
    context,
    needsSelection:
      needsSelection ||
      (!loading && !context?.opportunityId && !getActiveOpportunityContext()?.opportunityId),
    refresh,
  };
}

/** Sync session from Registry without React (e.g. after create). */
export { opportunityContextFromRegistry, rememberOpportunityRegistryContext };

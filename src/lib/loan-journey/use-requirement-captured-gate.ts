"use client";

/**
 * ADR-018 Wave 3 — Opportunity Workspace entry gate.
 * Redirects to Lead Information when Requirement is not Captured.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import {
  opportunityWorkspaceGateRedirect,
  type JourneyOpportunityLike,
} from "@/lib/loan-journey/adr-018-routing";

export type RequirementCapturedGateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "allowed"; opportunity: JourneyOpportunityLike }
  | { status: "redirecting" }
  | { status: "error"; message: string };

/**
 * When `opportunityId` is present, enforce Requirement Captured before OW stages.
 * Dashboard selection screens pass null and skip the gate.
 */
export function useRequirementCapturedGate(
  opportunityId: string | null | undefined,
): RequirementCapturedGateState {
  const router = useRouter();
  const [state, setState] = useState<RequirementCapturedGateState>(
    opportunityId ? { status: "loading" } : { status: "idle" },
  );

  useEffect(() => {
    const id = opportunityId?.trim() || null;
    if (!id) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    void enterpriseOpportunityApiClient
      .getOpportunity(id)
      .then((row) => {
        if (cancelled) return;
        const redirect = opportunityWorkspaceGateRedirect(row);
        if (redirect) {
          setState({ status: "redirecting" });
          router.replace(redirect);
          return;
        }
        setState({ status: "allowed", opportunity: row });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Could not load Opportunity.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [opportunityId, router]);

  return state;
}

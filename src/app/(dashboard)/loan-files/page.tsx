"use client";

/**
 * Legacy Loan Files book — redirected to Deal Workspace / My Deals (ADR-019 cleanup).
 * Deep links with ?file= or ?dealId= open `/deals/:dealId`.
 * Browse / create / hub entry → My Deals or Loan Journey.
 */

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { buildDealWorkspaceHref, buildLoanJourneyHref } from "@/lib/loan-journey/adr-018-routing";
import { getActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";

function LoanFilesRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const fileId = searchParams.get("file")?.trim() || null;
    const dealId = searchParams.get("dealId")?.trim() || null;
    const opportunityId = searchParams.get("opportunityId")?.trim() || null;
    const tab = searchParams.get("tab")?.trim() || null;
    const lenderId = searchParams.get("lenderId")?.trim() || null;
    const create = searchParams.get("create") || searchParams.get("action");
    const surface = searchParams.get("surface");
    const entry = searchParams.get("entry");

    if (fileId || dealId) {
      router.replace(
        buildDealWorkspaceHref({
          dealId: dealId || fileId,
          fileId,
          opportunityId,
          tab: tab || "lenders",
          lenderId,
        }),
      );
      return;
    }

    // Hub / create / bare browse — never keep users on Loan Files book
    if (create === "1" || create === "new" || surface === "hub" || entry === "dashboard") {
      const opp =
        opportunityId || getActiveOpportunityContext()?.opportunityId || null;
      router.replace(opp ? buildLoanJourneyHref(opp) : ROUTES.LOAN_JOURNEY);
      return;
    }

    router.replace(ROUTES.MY_DEALS);
  }, [router, searchParams]);

  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center text-xs text-muted-foreground">
      Redirecting…
    </div>
  );
}

export default function LoanFilesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center text-xs text-muted-foreground">
          Redirecting…
        </div>
      }
    >
      <LoanFilesRedirectInner />
    </Suspense>
  );
}

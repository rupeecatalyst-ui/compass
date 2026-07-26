"use client";

import { Suspense } from "react";
import { LoanJourneyExecutionHub } from "@/components/catalyst-one/loan-journey/loan-journey-execution-hub";

/**
 * ADR-018 Wave 3 — Canonical Execution Hub.
 * Route: /loan-journey
 * Orchestration only — not Deal Workspace, Loan Files book, or Dashboard.
 */
export default function LoanJourneyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center text-xs text-muted-foreground">
          Loading Loan Journey…
        </div>
      }
    >
      <LoanJourneyExecutionHub />
    </Suspense>
  );
}

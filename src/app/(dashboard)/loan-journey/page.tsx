"use client";

import { Suspense } from "react";
import { LoanJourneyExecutionHub } from "@/components/catalyst-one/loan-journey/loan-journey-execution-hub";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

/**
 * ADR-018 Wave 3 — Canonical Execution Hub.
 * Route: /loan-journey
 * Orchestration only — not Deal Workspace, Loan Files book, or Dashboard.
 */
export default function LoanJourneyPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="loan-journey"
          statusLabel="Loading borrower journey..."
          density="panel"
        />
      }
    >
      <LoanJourneyExecutionHub />
    </Suspense>
  );
}

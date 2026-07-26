"use client";

/**
 * ADR-018 Wave 3 — Execution Hub host for /loan-journey.
 * Reuses LoanWorkspaceNavigator; never mounts Deal / LoanFile create.
 */

import { LoanWorkspaceNavigator } from "@/components/catalyst-one/loan-files/loan-workspace-navigator";

export function LoanJourneyExecutionHub() {
  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col -mx-4 md:-mx-6 lg:-mx-8">
      <LoanWorkspaceNavigator orchestrationMode />
    </div>
  );
}

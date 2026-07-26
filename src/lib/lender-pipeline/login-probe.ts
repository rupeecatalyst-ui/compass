/**
 * CO-UX-001 — Lender login probe (Identified → Logged In).
 * Minimal gate only — Payee / banker / competition / relationship notes removed.
 * Payee is an Accounting-stage concern (future).
 */

import type { LoanLenderExecution } from "@/types/catalyst-one";

export interface LenderLoginProbeValues {
  propertyIdentified: boolean;
}

export function isLenderLoginProbeComplete(
  caseExecution: Pick<
    LoanLenderExecution,
    "propertyIdentified" | "loginProbeCompletedAt"
  >,
): boolean {
  if (caseExecution.loginProbeCompletedAt) return true;
  return typeof caseExecution.propertyIdentified === "boolean";
}

export function buildLenderLoginProbePatch(
  values: LenderLoginProbeValues,
): Partial<LoanLenderExecution> {
  return {
    propertyIdentified: values.propertyIdentified,
    loginProbeCompletedAt: new Date().toISOString(),
  };
}

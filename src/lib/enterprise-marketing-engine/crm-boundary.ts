/**
 * CO-MARKETING-REDESIGN-003 — Contact / Opportunity boundary probe.
 * Binding, preview, filter, snapshot and execution must never create CRM records.
 */

let contactCreateAttempts = 0;
let opportunityCreateAttempts = 0;

export function resetMarketingCrmBoundaryCounters(): void {
  contactCreateAttempts = 0;
  opportunityCreateAttempts = 0;
}

export function getMarketingCrmBoundaryCounters(): {
  contactCreateAttempts: number;
  opportunityCreateAttempts: number;
} {
  return { contactCreateAttempts, opportunityCreateAttempts };
}

/** Test/probe hook — production marketing paths must never call this. */
export function recordMarketingContactCreateAttempt(): void {
  contactCreateAttempts += 1;
}

/** Test/probe hook — production marketing paths must never call this. */
export function recordMarketingOpportunityCreateAttempt(): void {
  opportunityCreateAttempts += 1;
}

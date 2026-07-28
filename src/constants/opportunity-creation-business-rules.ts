/**
 * Opportunity / Deal creation business rules (clarification SSOT).
 *
 * Opportunity is CREATED when the initial Customer Requirement form is saved —
 * not when documents or enrichment are complete.
 *
 * Deal does NOT exist until the first lender is identified in Loan Workspace.
 */

/** Fields required to create (Requirement Capture) an Opportunity. */
export const OPPORTUNITY_CREATION_REQUIRED_FIELDS = [
  "customer",
  "product",
  "requiredAmount",
  "lendingType",
  "transactionType",
  "businessSource",
] as const;

/** Explicitly NOT required for Opportunity creation. */
export const OPPORTUNITY_CREATION_NOT_REQUIRED = [
  "documents",
  "loanStructure",
  "businessProfile",
  "propertyDetails",
  "otherEnrichment",
] as const;

export const OPPORTUNITY_CREATION_RULE_SUMMARY =
  "An Opportunity is created when the Customer Requirement form is successfully saved (Customer, Product, Required Amount, Lending Type, Transaction Type, Business Source). Documents and enrichment are not required.";

export const DEAL_CREATION_RULE_SUMMARY =
  "A Deal does not exist until at least one lender is identified from the Loan Workspace. The first identified lender creates the first Deal; each additional lender creates an additional Deal.";

export const DASHBOARD_TODAY_NEW_OPPORTUNITIES_DEFINITION =
  "Today's New Opportunities = Opportunities with createdAt today (includes Dialogue), grouped by Business Source.";

export const DASHBOARD_TODAY_NEW_DEALS_DEFINITION =
  "Today's New Deals = Enterprise Deals with createdAt today. Independent from Opportunity counts.";

/**
 * CO-ARCH-003 Phase 2B Sprint 1 — Invoice Party (Accounting Master) SSOT.
 *
 * Invoice Party = entity against whom Rupee Catalyst raises its commission invoice
 * for a Deal. Not the loan disbursement beneficiary. Not necessarily the lender.
 *
 * Deal Workspace reads ONLY from Accounting → Invoice Party Master.
 */

import {
  isStageAtOrBeyond,
  isStageBeyond,
  migrateLegacyStage,
} from "@/constants/loan-stage-master";
import type { PipelineStage } from "@/types/catalyst-one";

/**
 * Configurable business stage that requires an Invoice Party.
 * Change this constant (future: Administration / EDL-backed config) to move the gate —
 * do not hard-code stage checks in UI or services.
 *
 * Semantics:
 * - At this stage and beyond → Invoice Party is required in Deal Workspace (UI).
 * - Progression *beyond* this stage is blocked until Invoice Party is assigned.
 */
export const INVOICE_PARTY_REQUIRED_FROM_STAGE: PipelineStage = "logged_in";

export const INVOICE_PARTY_REQUIRED_MESSAGE =
  "This Deal does not have an Invoice Party assigned. Please select an Invoice Party from the Accounting Master before proceeding.";

/** Party classification on the Master (accounting taxonomy). */
export const INVOICE_PARTY_TYPES = [
  "customer",
  "lender",
  "builder",
  "channel_partner",
  "chartered_accountant",
  "direct_corporate",
  "intermediary",
  "other",
] as const;

export type InvoicePartyType = (typeof INVOICE_PARTY_TYPES)[number];

export const INVOICE_PARTY_TYPE_OPTIONS: ReadonlyArray<{
  id: InvoicePartyType;
  label: string;
}> = [
  { id: "customer", label: "Customer" },
  { id: "lender", label: "Lender" },
  { id: "builder", label: "Builder" },
  { id: "channel_partner", label: "Channel Partner" },
  { id: "chartered_accountant", label: "Chartered Accountant" },
  { id: "direct_corporate", label: "Direct Corporate" },
  { id: "intermediary", label: "Intermediary / Channel" },
  { id: "other", label: "Other" },
];

export function getInvoicePartyTypeLabel(
  type: InvoicePartyType | string | undefined | null,
): string | undefined {
  if (!type) return undefined;
  return INVOICE_PARTY_TYPE_OPTIONS.find((o) => o.id === type)?.label ?? type;
}

export function isValidInvoicePartyType(value: unknown): value is InvoicePartyType {
  return typeof value === "string" && (INVOICE_PARTY_TYPES as readonly string[]).includes(value);
}

/** Normalize Deal gross-stage / lender-case aliases → PipelineStage. */
export function normalizeInvoicePartyStage(stage: string): PipelineStage {
  const s = stage.trim().toLowerCase().replace(/\s+/g, "_");
  const aliases: Record<string, PipelineStage> = {
    logged_in_wip: "logged_in",
    login: "logged_in",
    credit: "credit_wip",
    sanction: "soft_approved",
    soft_approval: "soft_approved",
    disbursement: "closure_wip",
    disbursed: "closure_wip",
  };
  if (aliases[s]) return aliases[s];
  return migrateLegacyStage(s);
}

/** UI: show / require Invoice Party at configured stage and beyond. */
export function requiresInvoiceParty(stage: string | PipelineStage): boolean {
  return isStageAtOrBeyond(
    normalizeInvoicePartyStage(String(stage)),
    INVOICE_PARTY_REQUIRED_FROM_STAGE,
  );
}

/**
 * Hard gate: target stage is beyond the configured required-from stage.
 * Used by Chanakya / Deal transitions / Lender Pipeline.
 */
export function invoicePartyRequiredToProgressTo(toStage: string | PipelineStage): boolean {
  return isStageBeyond(
    normalizeInvoicePartyStage(String(toStage)),
    INVOICE_PARTY_REQUIRED_FROM_STAGE,
  );
}

/** Complete when Accounting Invoice Party Master id is assigned on the Deal. */
export function isInvoicePartyComplete(input: {
  invoicePartyId?: string | null;
  /** @deprecated legacy bridge */
  commissionAccountingPayeeId?: string | null;
}): boolean {
  return Boolean(
    input.invoicePartyId?.trim() || input.commissionAccountingPayeeId?.trim(),
  );
}

/** @deprecated Use INVOICE_PARTY_TYPES — commercial payee type alias (no intermediary). */
export const LOAN_COMMERCIAL_PAYEE_TYPES = [
  "customer",
  "lender",
  "builder",
  "channel_partner",
  "chartered_accountant",
  "direct_corporate",
  "other",
] as const;

/** @deprecated */
export type LoanCommercialPayeeType = (typeof LOAN_COMMERCIAL_PAYEE_TYPES)[number];

/** @deprecated */
export const LOAN_COMMERCIAL_PAYEE_OPTIONS: ReadonlyArray<{
  id: LoanCommercialPayeeType;
  label: string;
}> = INVOICE_PARTY_TYPE_OPTIONS.filter(
  (o): o is { id: LoanCommercialPayeeType; label: string } =>
    (LOAN_COMMERCIAL_PAYEE_TYPES as readonly string[]).includes(o.id),
);

/** @deprecated */
export function getCommercialPayeeLabel(
  type: LoanCommercialPayeeType | undefined | null,
): string | undefined {
  return getInvoicePartyTypeLabel(type);
}

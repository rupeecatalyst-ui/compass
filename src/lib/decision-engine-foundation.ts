import type { LoanFile } from "@/types/catalyst-one";
import { getOccupancyLabel } from "@/constants/occupancy-master";

/**
 * CRC-10.3 — Decision Engine dimension hierarchy (configuration-driven rules in future sprints).
 * No lender logic or calculations in this module.
 */
export const DECISION_ENGINE_DIMENSION_ORDER = [
  "lender",
  "product",
  "customerCategory",
  "propertyType",
  "propertyOccupancy",
  "geography",
  "incomeSlab",
  "creditScore",
  "bankingProfile",
  "employmentType",
  "vintage",
  "loanAmount",
] as const;

export type DecisionEngineDimension = (typeof DECISION_ENGINE_DIMENSION_ORDER)[number];

export interface DecisionGeographyContext {
  city?: string;
  state?: string;
}

/**
 * Normalized input snapshot for future rule evaluation.
 * Rules must reference master data — never hardcoded business logic in application code.
 */
export interface DecisionEngineContext {
  lender?: string;
  product: string;
  customerCategory?: string;
  propertyType?: string;
  propertyOccupancyId?: string;
  propertyOccupancyLabel?: string;
  geography?: DecisionGeographyContext;
  incomeSlab?: string;
  creditScore?: number;
  bankingProfile?: string;
  employmentType?: string;
  vintage?: number;
  loanAmount?: number;
  requiredAmount?: number;
}

/** Placeholder result shape for future Decision Engine output. */
export interface DecisionEngineResult {
  eligible: boolean;
  matchedLenders?: string[];
  ltv?: number;
  riskScore?: number;
  reasons?: string[];
}

/** Build a decision context from a loan file (no evaluation). */
export function buildDecisionEngineContextFromLoan(file: LoanFile): DecisionEngineContext {
  return {
    lender: file.lender,
    product: file.loanProduct,
    propertyType: file.propertyType,
    propertyOccupancyId: file.occupancyId,
    propertyOccupancyLabel: getOccupancyLabel(file.occupancyId),
    geography: { city: file.city, state: file.state },
    employmentType: file.employmentType,
    loanAmount: file.loanAmount,
    requiredAmount: file.requiredAmount,
  };
}

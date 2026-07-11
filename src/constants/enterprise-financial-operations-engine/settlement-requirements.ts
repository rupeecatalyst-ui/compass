/**
 * EFOE default settlement requirement configurations.
 */

import { EFOE_DEFAULT_SETTLEMENT_REQUIREMENT_CODES } from "./lifecycle";

export interface EfoeDefaultSettlementRequirementConfig {
  requirementCode: string;
  requirementName: string;
  mandatory: boolean;
}

export const EFOE_DEFAULT_SETTLEMENT_REQUIREMENTS: EfoeDefaultSettlementRequirementConfig[] = [
  { requirementCode: EFOE_DEFAULT_SETTLEMENT_REQUIREMENT_CODES.PAN, requirementName: "PAN", mandatory: true },
  { requirementCode: EFOE_DEFAULT_SETTLEMENT_REQUIREMENT_CODES.AADHAAR, requirementName: "Aadhaar", mandatory: false },
  { requirementCode: EFOE_DEFAULT_SETTLEMENT_REQUIREMENT_CODES.BANK_DETAILS, requirementName: "Bank Details", mandatory: true },
  { requirementCode: EFOE_DEFAULT_SETTLEMENT_REQUIREMENT_CODES.CANCELLED_CHEQUE, requirementName: "Cancelled Cheque", mandatory: true },
  { requirementCode: EFOE_DEFAULT_SETTLEMENT_REQUIREMENT_CODES.KYC, requirementName: "KYC", mandatory: true },
  { requirementCode: EFOE_DEFAULT_SETTLEMENT_REQUIREMENT_CODES.TDS, requirementName: "TDS", mandatory: false },
  { requirementCode: EFOE_DEFAULT_SETTLEMENT_REQUIREMENT_CODES.GST, requirementName: "GST", mandatory: false },
  { requirementCode: EFOE_DEFAULT_SETTLEMENT_REQUIREMENT_CODES.SIGNED_AGREEMENT, requirementName: "Signed Agreement", mandatory: true },
  { requirementCode: EFOE_DEFAULT_SETTLEMENT_REQUIREMENT_CODES.ADDRESS_PROOF, requirementName: "Address Proof", mandatory: false },
  { requirementCode: EFOE_DEFAULT_SETTLEMENT_REQUIREMENT_CODES.MOBILE_VERIFICATION, requirementName: "Mobile Verification", mandatory: false },
  { requirementCode: EFOE_DEFAULT_SETTLEMENT_REQUIREMENT_CODES.EMAIL_VERIFICATION, requirementName: "Email Verification", mandatory: false },
];

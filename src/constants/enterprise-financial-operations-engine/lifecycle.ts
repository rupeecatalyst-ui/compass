/**
 * EFOE lifecycle and framework constants.
 */

export const EFOE_FRAMEWORK_VERSION = "12.0.0";

export const EFOE_DISBURSEMENT_STATUS = {
  NOT_DISBURSED: "not_disbursed",
  PARTIALLY_DISBURSED: "partially_disbursed",
  FULLY_DISBURSED: "fully_disbursed",
} as const;

export const EFOE_INVOICE_PAYEE_TYPES = {
  BANK: "bank",
  NBFC: "nbfc",
  BUILDER: "builder",
  CORPORATE: "corporate",
  INDIVIDUAL: "individual",
  REGISTERED_ORGANIZATION: "registered_organization",
} as const;

export const EFOE_BENEFICIARY_TYPES = {
  COMPANY: "company",
  EMPLOYEE: "employee",
  RELATIONSHIP_MANAGER: "relationship_manager",
  WEALTH_PARTNER: "wealth_partner",
  CA: "ca",
  BUILDER: "builder",
  VENDOR: "vendor",
  PARTNER: "partner",
  CUSTOM: "custom",
} as const;

export const EFOE_CLAWBACK_STRATEGIES = {
  RECOVER_IMMEDIATELY: "recover_immediately",
  RECOVER_FROM_FUTURE_SETTLEMENT: "recover_from_future_settlement",
  COMPANY_ABSORBS: "company_absorbs",
  MANUAL_RECOVERY: "manual_recovery",
  WRITE_OFF: "write_off",
} as const;

export const EFOE_INVOICE_LIFECYCLE_STATUS = {
  DRAFT: "draft",
  ISSUED: "issued",
  PAID: "paid",
  CANCELLED: "cancelled",
  VOID: "void",
} as const;

export const EFOE_SETTLEMENT_STATUS = {
  PENDING: "pending",
  ELIGIBLE: "eligible",
  PROCESSING: "processing",
  RELEASED: "released",
  REVERSED: "reversed",
  BLOCKED: "blocked",
} as const;

export const EFOE_DEFAULT_SETTLEMENT_REQUIREMENT_CODES = {
  PAN: "pan",
  AADHAAR: "aadhaar",
  BANK_DETAILS: "bank_details",
  CANCELLED_CHEQUE: "cancelled_cheque",
  KYC: "kyc",
  TDS: "tds",
  GST: "gst",
  SIGNED_AGREEMENT: "signed_agreement",
  ADDRESS_PROOF: "address_proof",
  MOBILE_VERIFICATION: "mobile_verification",
  EMAIL_VERIFICATION: "email_verification",
} as const;

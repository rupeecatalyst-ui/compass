export const ETE_FRAMEWORK_VERSION = "1.0.0-spr001";

export const ETE_TASK_TYPES = {
  INDEPENDENT: "independent",
  OPPORTUNITY: "opportunity",
} as const;

export const ETE_TASK_COLOURS = {
  BLUE: "blue",
  ORANGE: "orange",
  RED: "red",
} as const;

/** Hours before due when colour turns orange. */
export const ETE_DUE_SOON_HOURS = 4;

export const ETE_PREDEFINED_DESCRIPTIONS = {
  CALL_CUSTOMER: "Call Customer",
  FOLLOW_UP_DOCUMENTS: "Follow-up Documents",
  VERIFY_CIBIL: "Verify CIBIL",
  FOLLOW_UP_LENDER: "Follow-up Lender",
  RESOLVE_QUERY: "Resolve Query",
  FOLLOW_UP_MANAGER: "Follow-up Manager",
  INTERNAL_REVIEW: "Internal Review",
  CUSTOMER_MEETING: "Customer Meeting",
  BRANCH_VISIT: "Branch Visit",
  GENERAL: "General",
  CUSTOM: "Custom",
} as const;

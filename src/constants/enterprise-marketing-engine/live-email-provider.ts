/**
 * CO-MARKETING-LIVE-EMAIL-FOUNDATION-001 — Provider-neutral live email adapter constants.
 * No ESP is selected. Dry-run remains the active adapter. No network send.
 */

export const MARKETING_LIVE_PROVIDER_DECISION_REQUIRED = false as const;

export const MARKETING_LIVE_PROVIDER_STATUS = "SMTP_ADAPTER_IMPLEMENTED_GATES_OFF" as const;

export const MARKETING_PROVIDER_VERIFICATION_AWAITING = "AWAITING_PROVIDER_VERIFICATION" as const;

export const MARKETING_LIVE_ADAPTER_NOT_CONNECTED = "LIVE_ADAPTER_NOT_CONNECTED" as const;

export const MARKETING_LIVE_ADAPTER_EXECUTION_BLOCKED = "LIVE_ADAPTER_EXECUTION_BLOCKED" as const;

export const MARKETING_PROVIDER_CONNECT_BLOCKED = "PROVIDER_CONNECT_BLOCKED" as const;

export const MARKETING_LIVE_PROVIDER_NOTICE =
  "Phase 1 Hostinger SMTP adapter is implemented. Dry-run remains active. Live execution and provider connect stay OFF." as const;

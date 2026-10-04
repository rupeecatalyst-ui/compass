/**
 * CO-MARKETING-REDESIGN-009 — Delivery operations copy and confirmation phrases.
 * Live provider sending remains disabled.
 */

export const MARKETING_LIVE_PROVIDER_SENDING_DISABLED =
  "Live provider sending is disabled. TEST MODE launch is simulation only." as const;

export const MARKETING_STOP_CONFIRMATION_PHRASE = "STOP" as const;
export const MARKETING_BATCH_CONFIRMATION_PHRASE = "RUN" as const;
export const MARKETING_RETRY_CONFIRMATION_PHRASE = "RETRY" as const;

export const MARKETING_DELIVERY_OPERATION_LABELS = {
  pause: "Pause",
  resume: "Resume",
  stop: "Stop",
  runNextBatch: "Run Next Batch",
  retry: "Retry eligible failures",
} as const;

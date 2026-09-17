/**
 * CO-MARKETING-MKT-01 / MKT-07 / MKT-09 / MKT-10 — Hard safety gates for Enterprise Marketing Engine.
 *
 * Live bulk send remains disabled until Product Owner authorizes.
 * Email + WhatsApp delivery infrastructure use dry_run mode by default.
 */

import {
  isMarketingSheetsReadEnabled,
  requestedMarketingSheetsMode,
  type EnterpriseMarketingSheetsMode,
} from "./sheets-runtime";

export type { EnterpriseMarketingSheetsMode } from "./sheets-runtime";

/**
 * Live execution requires explicit server configuration and downstream safeguards.
 */
export function marketingGateEnabled(value: string | undefined): boolean {
  return value === "true";
}

export const ENTERPRISE_MARKETING_EXECUTION_ENABLED =
  typeof process !== "undefined" && marketingGateEnabled(process.env.ENTERPRISE_MARKETING_EXECUTION_ENABLED);

/** MKT-06 — batch scheduler / dry-run execution foundation. */
export const ENTERPRISE_MARKETING_EXECUTION_DRY_RUN_ENABLED = true as const;

/**
 * CO-MARKETING-MKT-11 — Controlled qualification handoff (explicit QUALIFIED only).
 * Mass conversion remains forbidden. Live ECM/Opportunity writes require mode=live.
 */
export const ENTERPRISE_MARKETING_HANDOFF_ENABLED = true as const;

export const ENTERPRISE_MARKETING_MASS_HANDOFF_ENABLED = false as const;

export type EnterpriseMarketingHandoffMode = "fixture" | "live";

function resolveHandoffMode(): EnterpriseMarketingHandoffMode {
  const raw = (process.env.ENTERPRISE_MARKETING_HANDOFF_MODE ?? "fixture").trim().toLowerCase();
  if (raw === "live" || raw === "fixture") return raw;
  return "fixture";
}

export const ENTERPRISE_MARKETING_HANDOFF_MODE: EnterpriseMarketingHandoffMode =
  typeof process !== "undefined" ? resolveHandoffMode() : "fixture";

/** Bulk import / mirror of external audience into Supabase — always false. */
export const ENTERPRISE_MARKETING_AUDIENCE_IMPORT_ENABLED = false as const;

/**
 * Provider connection requires explicit server configuration.
 */
export const ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED =
  typeof process !== "undefined" && marketingGateEnabled(process.env.ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED);

/**
 * CO-MARKETING-MKT-02 — Google Sheets data-source READ mode.
 * Snapshot at module load only. Production status must call resolveMarketingSheetsSourceStatus().
 */
export const ENTERPRISE_MARKETING_SHEETS_MODE: EnterpriseMarketingSheetsMode =
  typeof process !== "undefined" ? requestedMarketingSheetsMode() : "fixture";

export const ENTERPRISE_MARKETING_SHEETS_READ_ENABLED = isMarketingSheetsReadEnabled();

export {
  ENTERPRISE_MARKETING_EMAIL_MODE,
  type EnterpriseMarketingEmailDeliveryMode,
} from "./email-delivery";

export {
  ENTERPRISE_MARKETING_WHATSAPP_MODE,
  type EnterpriseMarketingWhatsAppDeliveryMode,
} from "./whatsapp-delivery";

export const ENTERPRISE_MARKETING_SAFETY = {
  executionEnabled: ENTERPRISE_MARKETING_EXECUTION_ENABLED,
  executionDryRunEnabled: ENTERPRISE_MARKETING_EXECUTION_DRY_RUN_ENABLED,
  handoffEnabled: ENTERPRISE_MARKETING_HANDOFF_ENABLED,
  massHandoffEnabled: ENTERPRISE_MARKETING_MASS_HANDOFF_ENABLED,
  handoffMode: ENTERPRISE_MARKETING_HANDOFF_MODE,
  audienceImportEnabled: ENTERPRISE_MARKETING_AUDIENCE_IMPORT_ENABLED,
  providerConnectEnabled: ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
  sheetsMode: ENTERPRISE_MARKETING_SHEETS_MODE,
  sheetsReadEnabled: ENTERPRISE_MARKETING_SHEETS_READ_ENABLED,
  sprint: "CO-MARKETING-ACTIVATION-002",
  notice: `EME ACTIVATION-002 — Live execution ${ENTERPRISE_MARKETING_EXECUTION_ENABLED ? "ON" : "OFF"}; provider connect ${ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED ? "ON" : "OFF"}. Campaign sends remain subject to approval, snapshot, and delivery safeguards.`,
} as const;

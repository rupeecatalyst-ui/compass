/**
 * CO-MARKETING-MKT-01 / MKT-07 / MKT-09 / MKT-10 — Hard safety gates for Enterprise Marketing Engine.
 *
 * Live bulk send remains disabled until Product Owner authorizes.
 * Email + WhatsApp delivery infrastructure use dry_run mode by default.
 */

/** Live campaign send (email / WhatsApp / digital bulk) — false until PO authorizes. */
export const ENTERPRISE_MARKETING_EXECUTION_ENABLED = false as const;

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
 * Broad provider-connect kill switch for live ESP/WA/ads adapters.
 * Remains false in MKT-09 — dry_run adapters do not require this.
 */
export const ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED = false as const;

/**
 * CO-MARKETING-MKT-02 — Google Sheets data-source READ mode.
 */
export type EnterpriseMarketingSheetsMode = "off" | "fixture" | "live";

function resolveSheetsMode(): EnterpriseMarketingSheetsMode {
  const raw = (process.env.ENTERPRISE_MARKETING_SHEETS_MODE ?? "off").trim().toLowerCase();
  if (raw === "fixture" || raw === "live" || raw === "off") return raw;
  return "off";
}

export const ENTERPRISE_MARKETING_SHEETS_MODE: EnterpriseMarketingSheetsMode =
  typeof process !== "undefined" ? resolveSheetsMode() : "off";

export const ENTERPRISE_MARKETING_SHEETS_READ_ENABLED =
  ENTERPRISE_MARKETING_SHEETS_MODE === "fixture" ||
  ENTERPRISE_MARKETING_SHEETS_MODE === "live";

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
  notice:
    "EME ACTIVATION-002 — Full Command Center workflow active in MARKETING TEST MODE (dry-run / fixture). Live unrestricted bulk email/WhatsApp remain OFF. No 100k audience mirror. Controlled qualified handoff only.",
} as const;

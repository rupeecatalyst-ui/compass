/**
 * CO-MARKETING-MKT-01 / MKT-07 / MKT-09 — Runtime safety enforcement.
 */

import {
  ENTERPRISE_MARKETING_AUDIENCE_IMPORT_ENABLED,
  ENTERPRISE_MARKETING_EMAIL_MODE,
  ENTERPRISE_MARKETING_EXECUTION_DRY_RUN_ENABLED,
  ENTERPRISE_MARKETING_EXECUTION_ENABLED,
  ENTERPRISE_MARKETING_HANDOFF_ENABLED,
  ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
  ENTERPRISE_MARKETING_WHATSAPP_MODE,
} from "@/constants/enterprise-marketing-engine";

export class EnterpriseMarketingSafetyError extends Error {
  readonly code = "EME_SAFETY_BLOCKED";
  readonly statusCode = 403;

  constructor(operation: string) {
    super(
      `Enterprise Marketing Engine blocked "${operation}" — capability disabled or not authorized.`,
    );
    this.name = "EnterpriseMarketingSafetyError";
  }
}

export function assertDryRunExecutionAllowed(operation = "execution.dry_run"): void {
  if (!ENTERPRISE_MARKETING_EXECUTION_DRY_RUN_ENABLED) {
    throw new EnterpriseMarketingSafetyError(operation);
  }
}

/** Allows dry_run email delivery; live requires explicit flags + PO authorization. */
export function assertEmailDeliveryAllowed(operation = "email.deliver"): void {
  if (ENTERPRISE_MARKETING_EMAIL_MODE === "off") {
    throw new EnterpriseMarketingSafetyError(`${operation}:mode_off`);
  }
  if (ENTERPRISE_MARKETING_EMAIL_MODE === "live") {
    if (!ENTERPRISE_MARKETING_EXECUTION_ENABLED || !ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED) {
      throw new EnterpriseMarketingSafetyError(`${operation}:live_not_authorized`);
    }
  }
}

/** Allows dry_run WhatsApp delivery; live requires explicit flags + PO authorization. */
export function assertWhatsAppDeliveryAllowed(operation = "whatsapp.deliver"): void {
  if (ENTERPRISE_MARKETING_WHATSAPP_MODE === "off") {
    throw new EnterpriseMarketingSafetyError(`${operation}:mode_off`);
  }
  if (ENTERPRISE_MARKETING_WHATSAPP_MODE === "live") {
    if (!ENTERPRISE_MARKETING_EXECUTION_ENABLED || !ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED) {
      throw new EnterpriseMarketingSafetyError(`${operation}:live_not_authorized`);
    }
  }
}

export function assertMarketingExecutionAllowed(operation = "campaign.execution"): never {
  if (!ENTERPRISE_MARKETING_EXECUTION_ENABLED) {
    throw new EnterpriseMarketingSafetyError(operation);
  }
  throw new EnterpriseMarketingSafetyError(`${operation}:execution_flag_inconsistent`);
}

export function assertMarketingHandoffAllowed(operation = "operational.handoff"): void {
  if (!ENTERPRISE_MARKETING_HANDOFF_ENABLED) {
    throw new EnterpriseMarketingSafetyError(operation);
  }
}

export function assertMarketingMassHandoffForbidden(
  operation = "qualification.mass_convert",
): never {
  throw new EnterpriseMarketingSafetyError(operation);
}

export function assertMarketingAudienceImportAllowed(operation = "audience.import"): never {
  if (!ENTERPRISE_MARKETING_AUDIENCE_IMPORT_ENABLED) {
    throw new EnterpriseMarketingSafetyError(operation);
  }
  throw new EnterpriseMarketingSafetyError(`${operation}:import_flag_inconsistent`);
}

export function assertMarketingProviderConnectAllowed(operation = "provider.connect"): never {
  if (!ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED) {
    throw new EnterpriseMarketingSafetyError(operation);
  }
  throw new EnterpriseMarketingSafetyError(`${operation}:provider_flag_inconsistent`);
}

/** Convenience blockers used by disabled port stubs. */
export function refuseEmailSend(): never {
  return assertMarketingExecutionAllowed("email.send");
}

export function refuseWhatsAppSend(): never {
  return assertMarketingExecutionAllowed("whatsapp.send");
}

export function refuseDigitalLaunch(): never {
  return assertMarketingExecutionAllowed("digital.launch");
}

export function refuseContactCreate(): never {
  throw new EnterpriseMarketingSafetyError("contact.create.direct");
}

export function refuseOpportunityCreate(): never {
  throw new EnterpriseMarketingSafetyError("opportunity.create.direct");
}

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
  isMarketingControlledTestSendEnabled,
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

export function assertMarketingLiveExecutionGate(
  enabled: boolean = ENTERPRISE_MARKETING_EXECUTION_ENABLED,
): void {
  if (!enabled) throw new EnterpriseMarketingSafetyError("campaign.execution");
}

/** Allows dry_run email delivery. Live campaign send requires durable production mode or both env gates. */
export function assertEmailDeliveryAllowed(
  operation = "email.deliver",
  options?: { productionLiveSend?: boolean },
): void {
  if (ENTERPRISE_MARKETING_EMAIL_MODE === "off") {
    throw new EnterpriseMarketingSafetyError(`${operation}:mode_off`);
  }
  if (operation === "email.controlled_test_send") {
    if (ENTERPRISE_MARKETING_EMAIL_MODE === "live" && !isMarketingControlledTestSendEnabled() && !options?.productionLiveSend) {
      throw new EnterpriseMarketingSafetyError(`${operation}:live_not_authorized`);
    }
    return;
  }
  if (ENTERPRISE_MARKETING_EMAIL_MODE === "live") {
    if (options?.productionLiveSend) return;
    if (!ENTERPRISE_MARKETING_EXECUTION_ENABLED || !ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED) {
      throw new EnterpriseMarketingSafetyError(`${operation}:live_not_authorized`);
    }
  }
}

export function assertMarketingLaunchAllowed(productionLive: boolean, operation = "campaign.execution"): void {
  if (productionLive || ENTERPRISE_MARKETING_EXECUTION_ENABLED) return;
  throw new EnterpriseMarketingSafetyError(operation);
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

export function refuseSmsSend(): never {
  throw new EnterpriseMarketingSafetyError("sms.send");
}

export function refuseMessengerSend(): never {
  throw new EnterpriseMarketingSafetyError("messenger.send");
}

export function refuseLandingPagePublish(): never {
  throw new EnterpriseMarketingSafetyError("landing_page.publish");
}

export function refuseContactCreate(): never {
  throw new EnterpriseMarketingSafetyError("contact.create.direct");
}

export function refuseOpportunityCreate(): never {
  throw new EnterpriseMarketingSafetyError("opportunity.create.direct");
}

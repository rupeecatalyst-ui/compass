/**
 * CO-C1-OPERATIONAL-EMAIL-001 — Honest delivery / domain status derivation.
 * Never fabricates Verified without provider confirmation.
 */

import { ENCE_EXTERNAL_DELIVERY_ENABLED } from "@/constants/enterprise-notification-communication-engine";
import type {
  EnterpriseCommunicationProfileRecord,
  EnterpriseCommunicationSmtpProvider,
} from "@/types/enterprise-communication-center";

export type OperationalEmailConfigStatus =
  | "verified"
  | "pending"
  | "failed"
  | "not_configured";

export type OperationalDeliveryConnectionStatus =
  | "connected"
  | "not_configured"
  | "credential_pending"
  | "simulation_only";

export function labelConfigStatus(status: OperationalEmailConfigStatus): string {
  switch (status) {
    case "verified":
      return "Verified";
    case "pending":
      return "Pending";
    case "failed":
      return "Failed";
    default:
      return "Not Configured";
  }
}

export function deriveProviderConnectionStatus(
  profile: Pick<
    EnterpriseCommunicationProfileRecord,
    "smtpProvider" | "smtpHost" | "smtpCredentialConfigured" | "active"
  >,
): OperationalDeliveryConnectionStatus {
  if (!profile.active || profile.smtpProvider === "none") {
    return "not_configured";
  }
  if (!profile.smtpCredentialConfigured && needsCredential(profile.smtpProvider)) {
    return "credential_pending";
  }
  // Live external delivery remains gated platform-wide — connection config ≠ live send.
  if (!ENCE_EXTERNAL_DELIVERY_ENABLED) {
    return "simulation_only";
  }
  return profile.smtpHost || profile.smtpProvider !== "smtp"
    ? "connected"
    : "not_configured";
}

function needsCredential(provider: EnterpriseCommunicationSmtpProvider): boolean {
  return provider !== "none";
}

/** Domain authentication is ops/provider-owned; UI must not invent Verified. */
export function deriveDomainAuthStatuses(profile: {
  smtpProvider: EnterpriseCommunicationSmtpProvider;
}): {
  spf: OperationalEmailConfigStatus;
  dkim: OperationalEmailConfigStatus;
  domain: OperationalEmailConfigStatus;
  sender: OperationalEmailConfigStatus;
} {
  if (profile.smtpProvider === "none") {
    return {
      spf: "not_configured",
      dkim: "not_configured",
      domain: "not_configured",
      sender: "not_configured",
    };
  }
  // Provider selected but Catalyst One has no live provider verification API wired.
  return {
    spf: "pending",
    dkim: "pending",
    domain: "pending",
    sender: "pending",
  };
}

export function isOperationalProductionSendingEnabled(): boolean {
  return Boolean(ENCE_EXTERNAL_DELIVERY_ENABLED);
}

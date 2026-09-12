/**
 * CO-MARKETING-REDESIGN-013 — Deliverability readiness service.
 * Honest fixture states. No DNS mutation. No inbound-email integration changes.
 */

import {
  ENTERPRISE_MARKETING_EXECUTION_ENABLED,
  ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
} from "@/constants/enterprise-marketing-engine";
import { MARKETING_PERMISSIONS } from "@/constants/enterprise-marketing-engine/permissions";
import { EnterpriseMarketingSafetyError } from "@/lib/enterprise-marketing-engine/safety";
import { assertMarketingPermission } from "@/lib/enterprise-marketing-engine/permissions";
import { composeMarketingDeliverabilityReadiness } from "@/lib/enterprise-marketing-engine/deliverability-readiness";
import { assessMarketingLiveEmailProviderReadiness } from "@/lib/enterprise-marketing-engine/live-email-provider-readiness";
import { forbidMarketingDnsMutation } from "@/lib/enterprise-marketing-engine/sender-eligibility";
import { createHostingerSmtpTransport } from "./adapters/hostinger-smtp-transport";
import { marketingSenderIdentityStore } from "./sender-identity-store";
import type { MarketingSmtpVerifyResult } from "@/lib/enterprise-marketing-engine/ports/smtp-transport.port";

type Actor = {
  userId?: string;
  role?: string;
  organizationId?: string | null;
  marketingPermissions?: string[];
};

function orgId(actorOrg?: string | null) {
  const trimmed = (actorOrg ?? "").trim();
  if (!trimmed || trimmed === "default") {
    throw Object.assign(new Error("Marketing requires an authenticated organization"), {
      statusCode: 400,
      code: "ORGANIZATION_REQUIRED",
    });
  }
  return trimmed;
}

export const marketingDeliverabilityService = {
  snapshot(actor: Actor) {
    if (ENTERPRISE_MARKETING_EXECUTION_ENABLED) {
      throw new EnterpriseMarketingSafetyError("deliverability.unexpected_execution");
    }
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.SENDER_MANAGE);
    const organizationId = orgId(actor.organizationId);
    const senders = marketingSenderIdentityStore.list(organizationId);
    const smtpReadiness = assessMarketingLiveEmailProviderReadiness();
    return {
      readiness: composeMarketingDeliverabilityReadiness({
        organizationId,
        providerConnectEnabled: ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
        executionEnabled: ENTERPRISE_MARKETING_EXECUTION_ENABLED,
        simulated: true,
      }),
      smtpReadiness: {
        selectedProvider: smtpReadiness.selectedProvider,
        executionEnabled: smtpReadiness.executionEnabled,
        providerConnectEnabled: smtpReadiness.providerConnectEnabled,
        liveSendAuthorized: smtpReadiness.liveSendAuthorized,
        phase1LiveRecipientCeiling: smtpReadiness.phase1LiveRecipientCeiling,
        phase1Sender: smtpReadiness.phase1Sender,
        smtpConfigured: smtpReadiness.smtp.blockers.length === 0,
        smtpBlockers: smtpReadiness.smtp.blockers,
        unsubscribeSecretPresent: smtpReadiness.unsubscribeSecretPresent,
        publicOriginPresent: smtpReadiness.publicOriginPresent,
        blockedReasons: smtpReadiness.blockedReasons,
        notice: smtpReadiness.notice,
      },
      senders: senders.map((row) => marketingSenderIdentityStore.toPublicDto(row)),
    };
  },

  lookupDns(actor: Actor): never {
    void actor.userId;
    return forbidMarketingDnsMutation();
  },

  async verifySmtp(
    actor: Actor,
    deps?: { transport?: { verify(): Promise<MarketingSmtpVerifyResult> } },
  ): Promise<MarketingSmtpVerifyResult> {
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.SENDER_MANAGE);
    orgId(actor.organizationId);
    const transport = deps?.transport ?? createHostingerSmtpTransport();
    const result = await transport.verify();
    const serialized = JSON.stringify(result);
    if (/ENTERPRISE_MARKETING_SMTP_PASSWORD/i.test(serialized)) {
      return {
        status: "FAILED",
        code: "marketing.smtp.transport_failure",
        notice: "SMTP verification failed",
      };
    }
    return result;
  },
};

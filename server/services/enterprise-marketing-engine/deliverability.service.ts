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
import { forbidMarketingDnsMutation } from "@/lib/enterprise-marketing-engine/sender-eligibility";
import { marketingSenderIdentityStore } from "./sender-identity-store";

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
    return {
      readiness: composeMarketingDeliverabilityReadiness({
        organizationId,
        providerConnectEnabled: ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
        executionEnabled: ENTERPRISE_MARKETING_EXECUTION_ENABLED,
        simulated: true,
      }),
      senders: senders.map((row) => marketingSenderIdentityStore.toPublicDto(row)),
    };
  },

  lookupDns(actor: Actor): never {
    void actor.userId;
    return forbidMarketingDnsMutation();
  },
};

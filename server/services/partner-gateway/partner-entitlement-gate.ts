/**
 * CO-WP-ACCESS-001 — Partner Gateway entitlement enforcement helpers.
 * Auth → Partner identity → Ownership → Effective entitlement → Action.
 */
import type { PartnerEntitlementAction } from "@/constants/enterprise-partner-entitlements";
import type { PartnerEffectiveEntitlements } from "@/types/enterprise-partner-entitlements";
import type { PartnerTokenPayload } from "@/types/enterprise-partner-gateway";
import { PartnerGatewayError } from "@server/services/partner-gateway/partner-binding.service";
import { partnerEntitlementsService } from "@server/services/partner-entitlements";

/**
 * Reject client-supplied partner identity that disagrees with the token.
 */
export function assertTokenPartnerIdentity(
  actor: PartnerTokenPayload,
  claimedPartnerId?: string | null,
): void {
  if (claimedPartnerId && claimedPartnerId.trim() && claimedPartnerId !== actor.partnerId) {
    throw new PartnerGatewayError(
      "Forged partner identity rejected",
      "FORBIDDEN",
      403,
    );
  }
}

export async function requirePartnerEntitlement(input: {
  actor: PartnerTokenPayload;
  action: PartnerEntitlementAction;
  entityKind?: "opportunity" | "deal" | null;
  entityId?: string | null;
  /** Optional client-supplied partner id — must match token or omitted. */
  claimedPartnerId?: string | null;
}): Promise<PartnerEffectiveEntitlements> {
  assertTokenPartnerIdentity(input.actor, input.claimedPartnerId);
  return partnerEntitlementsService.assertEntitlement({
    wealthPartnerId: input.actor.partnerId,
    organizationId: input.actor.organizationId,
    action: input.action,
    entityKind: input.entityKind ?? null,
    entityId: input.entityId ?? null,
  });
}

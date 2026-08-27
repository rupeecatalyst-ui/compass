/**
 * CO-WP-REFINEMENT-006 — Partner Legal Docket Gateway service.
 * Partner-scoped read + honest view/download audit only (no fake partner_sign).
 */

import { resolvePartnerBindingForUser, PartnerGatewayError } from "./partner-binding.service";
import { composePartnerLegalDocketDesk } from "./partner-legal-docket.compose";
import { wealthPartnerRegistryService } from "@server/services/wealth-partner-registry";
import { getLegalDocketFromCompliance } from "@/lib/enterprise-wealth-partner-legal-docket/state";
import type {
  PartnerLegalDocketDeskDto,
  PartnerLegalDocketPartnerAction,
} from "@/types/enterprise-partner-legal-docket";
import type { PartnerLegalSigningCapabilityDto } from "@/types/enterprise-partner-legal-docket";
import { PARTNER_LEGAL_SIGNING_CAPABILITY } from "@/constants/enterprise-partner-legal-docket";

const PARTNER_ALLOWED_ACTIONS = new Set<PartnerLegalDocketPartnerAction>([
  "record_view",
  "record_download",
]);

export const partnerLegalDocketService = {
  async getLegalDocketDesk(userId: string): Promise<PartnerLegalDocketDeskDto> {
    const binding = await resolvePartnerBindingForUser(userId);
    const bundle = await wealthPartnerRegistryService.getWorkspace(binding.partner.id);
    if (!bundle.legalCompliance) {
      throw new PartnerGatewayError(
        "Legal compliance projection is unavailable for this partner.",
        "LEGAL_DOCKET_UNAVAILABLE",
        503,
      );
    }
    const docket = getLegalDocketFromCompliance(bundle.partner.complianceJson);
    return composePartnerLegalDocketDesk({
      partner: bundle.partner,
      legalCompliance: bundle.legalCompliance,
      agreementState: docket.agreement,
    });
  },

  async runPartnerLegalAction(input: {
    userId: string;
    action: PartnerLegalDocketPartnerAction;
    documentId?: string | null;
  }): Promise<PartnerLegalDocketDeskDto> {
    if (!PARTNER_ALLOWED_ACTIONS.has(input.action)) {
      throw new PartnerGatewayError(
        "This action is not permitted for Wealth Partner self-service.",
        "ACTION_NOT_PERMITTED",
        403,
      );
    }

    const binding = await resolvePartnerBindingForUser(input.userId);
    await wealthPartnerRegistryService.runLegalDocketAction(binding.partner.id, {
      action: input.action,
      actorUserId: binding.user.id,
      documentId: input.documentId ?? null,
    });

    return this.getLegalDocketDesk(input.userId);
  },

  getSigningCapability(): PartnerLegalSigningCapabilityDto {
    return PARTNER_LEGAL_SIGNING_CAPABILITY;
  },
};

/**
 * CO-WP-IDENTITY-002 — Partner Identity Module service.
 * Reuses Home visiting-card projection — never duplicates branding config in Connect.
 */

import type { PartnerIdentityModuleDto } from "@/types/enterprise-partner-identity-module";
import { resolvePartnerBindingForUser } from "./partner-binding.service";
import { partnerHomeService } from "./partner-home.service";
import { composePartnerIdentityModule } from "./partner-identity-module.compose";

export const partnerIdentityModuleService = {
  async getIdentityModule(userId: string): Promise<PartnerIdentityModuleDto> {
    const binding = await resolvePartnerBindingForUser(userId);
    const home = await partnerHomeService.getHomeDashboard(userId, binding.partner.id);
    return composePartnerIdentityModule({
      visitingCard: home.visitingCard,
      partnerProfileJson: binding.partner.profileJson,
      brandingCompanyName: home.visitingCard.branding?.companyName,
    });
  },
};

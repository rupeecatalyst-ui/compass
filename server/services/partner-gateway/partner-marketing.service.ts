/**
 * CO-WP-EXP-001 — Partner Marketing / Resources desk.
 * Projects enterprise-managed experience catalogue items (marketing/creative types).
 * Does not create an independent partner asset library.
 */
import {
  resolvePartnerBindingForUser,
} from "@server/services/partner-gateway/partner-binding.service";
import { partnerEntitlementsService } from "@server/services/partner-entitlements";
import { PARTNER_HOME_FEED_CATALOG } from "@/constants/enterprise-partner-home";

export type PartnerMarketingResourceDto = {
  id: string;
  title: string;
  subtitle: string;
  categoryLabel: string;
  deepLink: string | null;
  contentType: string;
};

export type PartnerMarketingDeskDto = {
  partnerId: string;
  title: string;
  subtitle: string;
  dtoNotice: string;
  resources: PartnerMarketingResourceDto[];
  emptyState: { title: string; message: string };
  dtoSource: "enterprise_experience_engine_seed" | "enterprise_partner_marketing";
};

const MARKETING_TYPES = new Set([
  "marketing_creative",
  "brochure",
  "campaign",
  "campaign_announcement",
  "product_resource",
  "shareable",
  "creative",
]);

function categoryLabel(contentType: string): string {
  const map: Record<string, string> = {
    marketing_creative: "Creative",
    brochure: "Brochure",
    campaign: "Campaign",
    campaign_announcement: "Campaign",
    product_resource: "Product resource",
    shareable: "Shareable",
    creative: "Creative",
  };
  return map[contentType] || "Resource";
}

export const partnerMarketingService = {
  async getDesk(userId: string): Promise<PartnerMarketingDeskDto> {
    const binding = await resolvePartnerBindingForUser(userId);
    await partnerEntitlementsService.assertEntitlement({
      wealthPartnerId: binding.partner.id,
      organizationId: binding.partner.organizationId,
      action: "view",
    });

    // Enterprise-managed seed catalogue — filter marketing-relevant content types only.
    // When Experience Engine admin owns packages, this projection switches to that SSOT.
    const resources: PartnerMarketingResourceDto[] = PARTNER_HOME_FEED_CATALOG.filter((item) => {
      const type = String(item.contentType || "").toLowerCase();
      const title = `${item.title || ""} ${item.subtitle || ""}`.toLowerCase();
      return (
        MARKETING_TYPES.has(type) ||
        /brochure|creative|campaign|marketing|resource|share/.test(type) ||
        /brochure|creative|campaign|marketing|shareable/.test(title)
      );
    })
      .slice(0, 40)
      .map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle || "",
        categoryLabel: categoryLabel(String(item.contentType || "resource")),
        deepLink: item.deepLink || null,
        contentType: String(item.contentType || "resource"),
      }));

    return {
      partnerId: binding.partner.id,
      title: "Marketing & Resources",
      subtitle: "Approved product resources and creatives managed by Catalyst One.",
      dtoNotice:
        "Resources are enterprise-managed. Catalyst Connect does not host an independent asset library. When no packages are published for partners, this desk stays honestly empty.",
      resources,
      emptyState: {
        title: "No marketing resources published",
        message:
          "Approved brochures, creatives, and campaign materials will appear here when Catalyst One publishes them for Wealth Partners. No sample creatives are shown.",
      },
      dtoSource: "enterprise_experience_engine_seed",
    };
  },
};

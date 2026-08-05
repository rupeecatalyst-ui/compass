/**
 * CO-WP-IDENTITY-002 — Compose expanded Identity Module from Enterprise partner projection.
 */

import type { PartnerHomeVisitingCardDto } from "@/types/enterprise-partner-gateway";
import type { PartnerIdentityModuleDto } from "@/types/enterprise-partner-identity-module";

export const PARTNER_IDENTITY_MODULE_VERSION = "CO-WP-IDENTITY-002";

function readProfileString(profileJson: unknown, key: string): string | null {
  if (!profileJson || typeof profileJson !== "object" || Array.isArray(profileJson)) {
    return null;
  }
  const value = (profileJson as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseLanguages(label: string | null, profileJson: unknown): string[] {
  if (profileJson && typeof profileJson === "object" && !Array.isArray(profileJson)) {
    const raw = (profileJson as Record<string, unknown>).languages;
    if (Array.isArray(raw)) {
      return raw
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim());
    }
  }
  if (!label) return [];
  return label
    .split(/[,|/]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function projectSocialLinks(profileJson: unknown): PartnerIdentityModuleDto["socialLinks"] {
  const keys: Array<{ id: string; label: string; profileKey: string }> = [
    { id: "linkedin", label: "LinkedIn", profileKey: "linkedinUrl" },
    { id: "instagram", label: "Instagram", profileKey: "instagramUrl" },
    { id: "facebook", label: "Facebook", profileKey: "facebookUrl" },
    { id: "twitter", label: "X / Twitter", profileKey: "twitterUrl" },
    { id: "youtube", label: "YouTube", profileKey: "youtubeUrl" },
  ];

  const fromArray: PartnerIdentityModuleDto["socialLinks"] = [];
  if (profileJson && typeof profileJson === "object" && !Array.isArray(profileJson)) {
    const social = (profileJson as Record<string, unknown>).socialLinks;
    if (Array.isArray(social)) {
      for (const row of social) {
        if (!row || typeof row !== "object" || Array.isArray(row)) continue;
        const r = row as Record<string, unknown>;
        const id = typeof r.id === "string" ? r.id : typeof r.label === "string" ? r.label : null;
        const label = typeof r.label === "string" ? r.label : id;
        const url = typeof r.url === "string" && r.url.trim() ? r.url.trim() : null;
        if (!id || !label) continue;
        fromArray.push({ id, label, url, enabled: Boolean(url) });
      }
    }
  }

  if (fromArray.length) return fromArray;

  return keys.map((k) => {
    const url = readProfileString(profileJson, k.profileKey);
    return {
      id: k.id,
      label: k.label,
      url,
      enabled: Boolean(url),
    };
  });
}

export function composePartnerIdentityModule(input: {
  visitingCard: PartnerHomeVisitingCardDto;
  partnerProfileJson?: unknown;
  brandingCompanyName?: string;
}): PartnerIdentityModuleDto {
  const card = input.visitingCard;
  const profile = input.partnerProfileJson;
  const languagesLabel =
    card.languagesLabel || readProfileString(profile, "languagesLabel");
  const languageItems = parseLanguages(languagesLabel, profile);
  const branchLabel =
    readProfileString(profile, "branchLabel") ||
    readProfileString(profile, "officeBranch") ||
    null;
  const officeAddress =
    readProfileString(profile, "officeAddress") || card.back?.companyAddress || null;

  return {
    version: PARTNER_IDENTITY_MODULE_VERSION,
    dtoSource: "enterprise_partner_identity_module",
    dtoNotice:
      "Identity Module projected from Catalyst One. Connect does not manage partner profile or branding configuration.",
    officialProfile: {
      displayName: card.partnerDisplayName,
      professionalTitle: card.professionalTitle,
      partnerCode: card.partnerCode,
      tierLabel: card.tier?.tierLabel || null,
      verifiedLabel: card.verifiedIdentity?.label || null,
      verifiedStatus: card.verifiedIdentity?.status || null,
      profilePhotoUrl: card.profilePhotoUrl,
      initials: card.initials,
      yearsOfExperienceLabel: card.yearsOfExperienceLabel,
      city: card.city,
    },
    digitalVisitingCard: card,
    qrCode: {
      status: card.qr?.status || "pending",
      imageUrl: card.qr?.imageUrl || null,
      caption: card.qr?.caption || "Scan to Connect",
      payloadUrl: card.qr?.payloadUrl || null,
    },
    referralLink: {
      label: "Referral Link",
      url: card.share?.url || card.qr?.payloadUrl || "",
      copyHint: "Share your Catalyst One referral link with customers.",
    },
    contactDetails: {
      email: card.email,
      mobile: card.mobile,
      city: card.city,
      websiteUrl: card.back?.websiteUrl || null,
      supportContact: card.back?.supportContact || null,
    },
    products: (card.authorisedProducts || []).map((p) => ({ ...p })),
    productsNotice:
      card.authorisedProductsNotice ||
      "Authorised products are projected from Catalyst One.",
    languages: {
      label: languagesLabel,
      items: languageItems,
      notice: languageItems.length
        ? "Languages projected from your Enterprise partner profile."
        : "Languages appear when published on your Enterprise partner profile.",
    },
    officeDetails: {
      companyName:
        input.brandingCompanyName ||
        card.branding?.companyName ||
        "Rupee Catalyst",
      companyAddress: officeAddress,
      branchLabel,
      websiteUrl: card.back?.websiteUrl || null,
      supportContact: card.back?.supportContact || null,
      poweredByLabel: card.back?.poweredByLabel || null,
    },
    socialLinks: projectSocialLinks(profile),
  };
}

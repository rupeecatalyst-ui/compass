/**
 * CO-WP-IDENTITY-002 — Expanded Partner Identity Module DTO.
 * All fields projected from Catalyst One — Connect never manages profile/branding.
 */

import type { PartnerHomeVisitingCardDto } from "./enterprise-partner-gateway";

export type PartnerIdentityOfficialProfileDto = {
  displayName: string;
  professionalTitle: string | null;
  partnerCode: string | null;
  tierLabel: string | null;
  verifiedLabel: string | null;
  verifiedStatus: string | null;
  profilePhotoUrl: string | null;
  initials: string;
  yearsOfExperienceLabel: string | null;
  city: string | null;
};

export type PartnerIdentityQrDto = {
  status: string;
  imageUrl: string | null;
  caption: string;
  payloadUrl: string | null;
};

export type PartnerIdentityReferralLinkDto = {
  label: string;
  url: string;
  copyHint: string;
};

export type PartnerIdentityContactDetailsDto = {
  email: string | null;
  mobile: string | null;
  city: string | null;
  websiteUrl: string | null;
  supportContact: string | null;
};

export type PartnerIdentityProductDto = {
  productCode: string;
  productLabel: string;
  iconLabel: string;
};

export type PartnerIdentityLanguagesDto = {
  label: string | null;
  items: string[];
  notice: string;
};

export type PartnerIdentityOfficeDetailsDto = {
  companyName: string;
  companyAddress: string | null;
  branchLabel: string | null;
  websiteUrl: string | null;
  supportContact: string | null;
  poweredByLabel: string | null;
};

export type PartnerIdentitySocialLinkDto = {
  id: string;
  label: string;
  url: string | null;
  enabled: boolean;
};

export type PartnerIdentityModuleDto = {
  version: string;
  dtoSource: "enterprise_partner_identity_module";
  dtoNotice: string;
  /** Official profile summary */
  officialProfile: PartnerIdentityOfficialProfileDto;
  /** Full Digital Visiting Card projection (for card surface + actions) */
  digitalVisitingCard: PartnerHomeVisitingCardDto;
  qrCode: PartnerIdentityQrDto;
  referralLink: PartnerIdentityReferralLinkDto;
  contactDetails: PartnerIdentityContactDetailsDto;
  products: PartnerIdentityProductDto[];
  productsNotice: string;
  languages: PartnerIdentityLanguagesDto;
  officeDetails: PartnerIdentityOfficeDetailsDto;
  socialLinks: PartnerIdentitySocialLinkDto[];
};

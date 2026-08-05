/**
 * CO-WP-SEARCH-001 — Unified Partner Global Search DTO.
 * Catalyst One owns ranking / partner scope. Connect presents only.
 */

export type PartnerSearchHitGroupId = "customers" | "opportunities" | "documents";

export type PartnerSearchHitDto = {
  id: string;
  group: PartnerSearchHitGroupId;
  title: string;
  subtitle: string;
  /** Which query field matched (presentation hint). */
  matchedOn: string;
  deepLink: string;
};

export type PartnerSearchGroupDto = {
  id: PartnerSearchHitGroupId;
  label: string;
  hits: PartnerSearchHitDto[];
};

export type PartnerUnifiedSearchDto = {
  query: string;
  groups: PartnerSearchGroupDto[];
  totalHits: number;
  dtoSource: "enterprise_partner_search";
  dtoNotice: string;
};

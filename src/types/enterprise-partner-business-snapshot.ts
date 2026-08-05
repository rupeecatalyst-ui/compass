/**
 * CO-WP-HOME-SNAPSHOT-001 — Partner Home Business Snapshot DTO.
 * Premium glanceable KPIs projected by Catalyst One — companion renders only.
 */

export type PartnerBusinessSnapshotCardTone = "default" | "accent" | "warning" | "success";

export type PartnerBusinessSnapshotCardDto = {
  id: string;
  label: string;
  valueLabel: string;
  hint: string | null;
  deepLink: string;
  tone: PartnerBusinessSnapshotCardTone;
};

export type PartnerHomeBusinessSnapshotDto = {
  version: string;
  dtoSource: "enterprise_partner_business_snapshot";
  title: string;
  periodLabel: string;
  dtoNotice: string;
  cards: PartnerBusinessSnapshotCardDto[];
};

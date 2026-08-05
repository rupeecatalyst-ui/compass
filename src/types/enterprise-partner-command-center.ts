/**
 * CO-WP-COMMAND-001 — Partner Command Center DTO.
 * Answers: "What should I do next?" — actionable projections only.
 */

export type PartnerCommandActionItemDto = {
  id: string;
  title: string;
  subtitle: string;
  urgencyLabel: string;
  ctaLabel: string;
  ctaDeepLink: string;
};

export type PartnerCommandActivityItemDto = {
  id: string;
  title: string;
  body: string;
  occurredAt: string;
  deepLink: string | null;
};

export type PartnerCommandQuickActionDto = {
  id: string;
  label: string;
  deepLink: string;
};

export type PartnerCommandPriorityDto = {
  title: string;
  reason: string;
  ctaLabel: string;
  ctaDeepLink: string;
};

export type PartnerCommandCommissionSnapshotDto = {
  periodLabel: string;
  earnedLabel: string;
  pendingLabel: string;
  notice: string;
  deepLink: string;
};

export type PartnerCommandMonthlyTargetDto = {
  periodLabel: string;
  targetLabel: string;
  achievedLabel: string;
  percent: number;
  notice: string;
  deepLink: string;
};

export type PartnerCommandCenterDto = {
  version: string;
  dtoSource: "enterprise_partner_command_center";
  dtoNotice: string;
  guidingQuestion: string;
  todaysPriority: PartnerCommandPriorityDto | null;
  opportunitiesRequiringAction: PartnerCommandActionItemDto[];
  pendingDocuments: PartnerCommandActionItemDto[];
  todaysFollowUps: PartnerCommandActionItemDto[];
  commissionSnapshot: PartnerCommandCommissionSnapshotDto;
  monthlyTargetProgress: PartnerCommandMonthlyTargetDto;
  aiSuggestions: PartnerCommandActionItemDto[];
  recentActivity: PartnerCommandActivityItemDto[];
  quickActions: PartnerCommandQuickActionDto[];
};

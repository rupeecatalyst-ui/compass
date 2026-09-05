/**
 * CO-MARKETING-REDESIGN-016 — Qualification Inbox projection.
 * Genuine responses only. Engagement (delivered/open/click/landing) stays out of the inbox.
 */

import {
  MARKETING_GENUINE_RESPONSE_INTENTS,
  MARKETING_QUALIFICATION_INBOX_STATUS_LABELS,
} from "@/constants/enterprise-marketing-engine/qualification";
import { marketingQualificationReason } from "@/lib/enterprise-marketing-engine/qualification/handoff-notification";
import { marketingEngagementOnlyIntent } from "@/lib/enterprise-marketing-engine/qualification/inbox-boundary";
import type {
  MarketingInboxNextAction,
  MarketingQualificationDuplicateMatch,
  MarketingQualificationInboxRow,
  MarketingQualificationInboxStatus,
  MarketingQualificationRecord,
} from "@/types/enterprise-marketing-qualification";

export function isMarketingGenuineInboxResponse(
  row: Pick<MarketingQualificationRecord, "intent" | "businessState">,
): boolean {
  if (marketingEngagementOnlyIntent(row.intent)) return false;
  if (row.businessState === "ENGAGED") return false;
  return (MARKETING_GENUINE_RESPONSE_INTENTS as readonly string[]).includes(row.intent)
    || row.businessState === "HANDED_OFF"
    || row.businessState === "QUALIFIED"
    || row.businessState === "NOT_INTERESTED"
    || row.businessState === "SUPPRESSED";
}

export function resolveMarketingInboxStatus(
  row: Pick<
    MarketingQualificationRecord,
    "businessState" | "processState" | "inboxStatus" | "duplicateMatch"
  >,
): MarketingQualificationInboxStatus {
  if (row.inboxStatus) return row.inboxStatus;
  if (row.businessState === "HANDED_OFF") return "CONVERTED";
  if (row.businessState === "SUPPRESSED") return "CLOSED";
  if (row.businessState === "NOT_INTERESTED") return "NOT_QUALIFIED";
  if (row.businessState === "QUALIFIED") return "QUALIFIED";
  if (row.duplicateMatch?.result === "existing_response") return "DUPLICATE";
  if (row.processState === "ROUTING" || row.processState === "HANDOFF_IN_PROGRESS") return "UNDER_REVIEW";
  return "NEW";
}

export function resolveMarketingInboxNextAction(
  status: MarketingQualificationInboxStatus,
): MarketingInboxNextAction {
  if (status === "NEW") return "review";
  if (status === "UNDER_REVIEW") return "qualify";
  if (status === "QUALIFIED") return "handoff";
  if (status === "DUPLICATE") return "view_existing";
  return "none";
}

export function composeMarketingQualificationInboxRow(
  row: MarketingQualificationRecord,
): MarketingQualificationInboxRow | null {
  if (!isMarketingGenuineInboxResponse(row)) return null;
  const inboxStatus = resolveMarketingInboxStatus(row);
  const duplicateMatch: MarketingQualificationDuplicateMatch = row.duplicateMatch ?? {
    result: "none",
    reused: false,
  };
  return {
    id: row.id,
    organizationId: row.organizationId,
    displayName: row.displayName?.trim() || "Not Specified",
    campaignId: row.campaignId,
    campaignName: row.campaignName ?? null,
    sourceTabName: row.sourceTabName ?? null,
    responseSummary: row.responseSummary?.trim() || marketingQualificationReason(row.intent),
    productInterest: row.product ?? null,
    responseTime: row.createdAt,
    assigneeUserId: row.assigneeUserId ?? null,
    inboxStatus,
    businessState: row.businessState,
    duplicateMatch,
    nextAction: resolveMarketingInboxNextAction(inboxStatus),
    qualificationId: row.id,
  };
}

export function composeMarketingQualificationInbox(
  rows: MarketingQualificationRecord[],
): MarketingQualificationInboxRow[] {
  return rows
    .map(composeMarketingQualificationInboxRow)
    .filter((row): row is MarketingQualificationInboxRow => row != null);
}

export function marketingInboxStatusLabel(status: MarketingQualificationInboxStatus): string {
  return MARKETING_QUALIFICATION_INBOX_STATUS_LABELS[status];
}

/**
 * CO-MARKETING-REDESIGN-017 — Single SSOT calculator for campaign attribution.
 * Reads existing Opportunity / Deal / Accounting projections. Never duplicates them.
 * Never treats Opportunity value as recognised revenue.
 */

import {
  MARKETING_ATTRIBUTION_NOTICE,
  MARKETING_ATTRIBUTION_ROI_UNAVAILABLE,
  MARKETING_ATTRIBUTION_RULES,
} from "@/constants/enterprise-marketing-engine/attribution";
import {
  availableMarketingMetric,
  unavailableMarketingMetric,
} from "@/lib/enterprise-marketing-engine/home-overview";
import { redactMarketingFingerprint } from "@/lib/enterprise-marketing-engine/analytics/redact-fingerprint";
import type { MarketingCampaign } from "@/types/enterprise-marketing-campaign";
import type { MarketingDurableSnapshotRecipientRecord } from "@/types/enterprise-marketing-durability";
import type { MarketingMetricValue } from "@/types/enterprise-marketing-analytics";
import type { MarketingQualificationRecord } from "@/types/enterprise-marketing-qualification";
import type {
  MarketingAttributedAccountingSsot,
  MarketingAttributedDealSsot,
  MarketingAttributedOpportunitySsot,
  MarketingAttributionChainRow,
  MarketingAttributionDashboard,
  MarketingAttributionFilters,
  MarketingAttributionStage,
  MarketingCampaignCostSsot,
} from "@/types/enterprise-marketing-attribution";
import { MARKETING_ATTRIBUTION_STAGES } from "@/types/enterprise-marketing-attribution";

const QUALIFIED_STATES = new Set(["QUALIFIED", "HANDED_OFF"]);

export { MARKETING_ATTRIBUTION_RULES };

function inRange(iso: string, from?: string | null, to?: string | null): boolean {
  if (!from && !to) return true;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return false;
  if (from && ms < Date.parse(from)) return false;
  if (to && ms > Date.parse(to)) return false;
  return true;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function uniqueCount(ids: Array<string | null | undefined>): number {
  return new Set(ids.filter((id): id is string => Boolean(id?.trim()))).size;
}

function deepestStage(row: {
  qualificationId: string | null;
  qualified: boolean;
  contactId: string | null;
  opportunityId: string | null;
  dealId: string | null;
  disbursed: boolean;
  revenue: boolean;
}): MarketingAttributionStage {
  if (row.revenue) return "recognised_revenue";
  if (row.disbursed) return "disbursal";
  if (row.dealId) return "deal";
  if (row.opportunityId) return "opportunity";
  if (row.contactId) return "contact";
  if (row.qualified) return "qualified_response";
  if (row.qualificationId) return "qualified_response";
  return "recipient";
}

export function marketingRevenueCopiedFromOpportunityValue(
  opportunityValue: number | null,
  recognisedRevenue: number | null,
): boolean {
  if (!isFiniteNumber(opportunityValue) || !isFiniteNumber(recognisedRevenue)) return false;
  return opportunityValue === recognisedRevenue;
}

export function computeMarketingCampaignRoi(input: {
  cost: number | null;
  recognisedRevenue: number | null;
}): MarketingMetricValue {
  if (!isFiniteNumber(input.cost) || !isFiniteNumber(input.recognisedRevenue) || input.cost <= 0) {
    return unavailableMarketingMetric(MARKETING_ATTRIBUTION_ROI_UNAVAILABLE);
  }
  const roi = ((input.recognisedRevenue - input.cost) / input.cost) * 100;
  return availableMarketingMetric(roi);
}

export function composeMarketingAttributionDashboard(input: {
  organizationId: string;
  generatedAt?: string;
  filters?: MarketingAttributionFilters;
  campaigns: MarketingCampaign[];
  snapshotRecipients?: MarketingDurableSnapshotRecipientRecord[];
  qualifications: MarketingQualificationRecord[];
  opportunities?: MarketingAttributedOpportunitySsot[];
  deals?: MarketingAttributedDealSsot[];
  accounting?: MarketingAttributedAccountingSsot[];
  campaignCosts?: MarketingCampaignCostSsot[];
  accountingAvailable?: boolean;
}): MarketingAttributionDashboard {
  const filters = input.filters ?? {};
  const org = input.organizationId;
  const campaigns = input.campaigns.filter((row) => row.organizationId === org);
  const campaignById = new Map(campaigns.map((row) => [row.id, row]));
  const opportunityById = new Map((input.opportunities ?? []).map((row) => [row.id, row]));
  const deals = input.deals ?? [];
  const accounting = input.accounting ?? [];
  const costs = input.campaignCosts ?? [];
  const accountingAvailable = input.accountingAvailable !== false;

  const campaignFilter = filters.campaignId?.trim() || null;
  const productFilter = filters.product?.trim() || null;
  const ownerFilter = filters.ownerUserId?.trim() || null;

  const recipients = (input.snapshotRecipients ?? []).filter((row) => {
    if (row.organizationId !== org) return false;
    if (campaignFilter && row.campaignId !== campaignFilter) return false;
    if (!inRange(row.createdAt, filters.from, filters.to)) return false;
    const campaign = campaignById.get(row.campaignId);
    if (productFilter && (campaign?.product ?? "") !== productFilter) return false;
    if (ownerFilter && (campaign?.routingPlaceholder.ownerUserId ?? campaign?.governance.createdByUserId ?? "") !== ownerFilter) {
      return false;
    }
    return true;
  });

  const qualifications = input.qualifications.filter((row) => {
    if (row.organizationId !== org) return false;
    if (campaignFilter && row.campaignId !== campaignFilter) return false;
    if (!inRange(row.createdAt, filters.from, filters.to)) return false;
    const campaign = campaignById.get(row.campaignId);
    const product = row.product ?? campaign?.product ?? opportunityById.get(row.opportunityId ?? "")?.product ?? null;
    const owner =
      row.assigneeUserId ??
      campaign?.routingPlaceholder.ownerUserId ??
      opportunityById.get(row.opportunityId ?? "")?.ownerUserId ??
      null;
    if (productFilter && product !== productFilter) return false;
    if (ownerFilter && owner !== ownerFilter) return false;
    return true;
  });

  const qualified = qualifications.filter((row) => QUALIFIED_STATES.has(row.businessState));
  const attributedKeys = new Set<string>();
  for (const row of recipients) {
    attributedKeys.add(`${row.campaignId}:${row.id}`);
  }
  for (const row of qualifications) {
    if (row.snapshotRecipientId) attributedKeys.add(`${row.campaignId}:${row.snapshotRecipientId}`);
    else attributedKeys.add(`${row.campaignId}:${row.recipientFingerprint}`);
  }

  const opportunityIds = [...new Set(qualifications.map((row) => row.opportunityId).filter(Boolean))] as string[];
  const persistedOpportunityValue = opportunityIds.reduce((sum, id) => {
    const ssot = opportunityById.get(id);
    if (!ssot || ssot.amountProvenance !== "persisted" || !isFiniteNumber(ssot.requiredAmount)) return sum;
    return sum + ssot.requiredAmount;
  }, 0);
  const hasPersistedOpportunityValue = opportunityIds.some((id) => {
    const ssot = opportunityById.get(id);
    return ssot?.amountProvenance === "persisted" && isFiniteNumber(ssot.requiredAmount);
  });

  const uniqueDeals = new Map<string, MarketingAttributedDealSsot>();
  for (const deal of deals) {
    if (!opportunityIds.includes(deal.opportunityId)) continue;
    uniqueDeals.set(deal.id, deal);
  }
  const disbursedAmount = [...uniqueDeals.values()].reduce((sum, deal) => {
    if (!deal.disbursedConfirmed || !isFiniteNumber(deal.disbursedAmount)) return sum;
    return sum + deal.disbursedAmount;
  }, 0);
  const hasDisbursed = [...uniqueDeals.values()].some(
    (deal) => deal.disbursedConfirmed && isFiniteNumber(deal.disbursedAmount),
  );

  const confirmedRevenueRows = accounting.filter(
    (row) => row.confirmed === true && uniqueDeals.has(row.dealId) && isFiniteNumber(row.recognisedRevenue),
  );
  const recognisedRevenue = confirmedRevenueRows.reduce((sum, row) => sum + row.recognisedRevenue, 0);

  const filteredCampaignIds = new Set([
    ...recipients.map((row) => row.campaignId),
    ...qualifications.map((row) => row.campaignId),
  ]);
  if (campaignFilter) filteredCampaignIds.add(campaignFilter);
  const costAmount = [...filteredCampaignIds].reduce((sum, id) => {
    const row = costs.find((item) => item.campaignId === id);
    return isFiniteNumber(row?.costAmount) ? sum + row!.costAmount : sum;
  }, 0);
  const hasCost = [...filteredCampaignIds].some((id) => isFiniteNumber(costs.find((item) => item.campaignId === id)?.costAmount));

  const revenueMetric =
    !accountingAvailable || confirmedRevenueRows.length === 0
      ? unavailableMarketingMetric("Unavailable")
      : availableMarketingMetric(recognisedRevenue);

  const attributedCount = attributedKeys.size;
  const qualifiedCount = uniqueCount(qualified.map((row) => row.id));
  const conversion =
    attributedCount === 0
      ? unavailableMarketingMetric("Unavailable")
      : availableMarketingMetric((qualifiedCount / attributedCount) * 100);

  const rowsByKey = new Map<string, MarketingAttributionChainRow>();
  const pushRow = (row: MarketingAttributionChainRow) => {
    const key = `${row.originalCampaignId}:${row.snapshotRecipientId ?? row.qualificationId ?? row.recipientFingerprintPreview}`;
    if (!rowsByKey.has(key)) rowsByKey.set(key, row);
  };

  for (const recipient of recipients) {
    const campaign = campaignById.get(recipient.campaignId);
    const qualification =
      qualifications.find((row) => row.snapshotRecipientId === recipient.id) ??
      qualifications.find(
        (row) => row.campaignId === recipient.campaignId && row.recipientFingerprint === recipient.recipientFingerprint,
      );
    const opportunityId = qualification?.opportunityId ?? null;
    const deal = opportunityId
      ? [...uniqueDeals.values()].find((item) => item.opportunityId === opportunityId) ?? null
      : null;
    const revenue = deal ? confirmedRevenueRows.some((item) => item.dealId === deal.id) : false;
    pushRow({
      campaignId: recipient.campaignId,
      campaignName: campaign?.name ?? null,
      snapshotId: recipient.snapshotId,
      snapshotRecipientId: recipient.id,
      recipientFingerprintPreview: redactMarketingFingerprint(recipient.recipientFingerprint),
      qualificationId: qualification?.id ?? null,
      contactId: qualification?.contactId ?? null,
      contactCreated: qualification?.contactCreated ?? null,
      opportunityId,
      opportunityCreated: qualification?.opportunityCreated ?? null,
      dealId: deal?.id ?? null,
      product: qualification?.product ?? campaign?.product ?? null,
      ownerUserId: qualification?.assigneeUserId ?? campaign?.routingPlaceholder.ownerUserId ?? null,
      attributedAt: qualification?.createdAt ?? recipient.createdAt,
      stageReached: deepestStage({
        qualificationId: qualification?.id ?? null,
        qualified: qualification ? QUALIFIED_STATES.has(qualification.businessState) : false,
        contactId: qualification?.contactId ?? null,
        opportunityId,
        dealId: deal?.id ?? null,
        disbursed: Boolean(deal?.disbursedConfirmed),
        revenue,
      }),
      originalCampaignId: recipient.campaignId,
    });
  }

  for (const qualification of qualifications) {
    const key = `${qualification.campaignId}:${qualification.snapshotRecipientId ?? qualification.id}`;
    if (rowsByKey.has(key)) continue;
    const campaign = campaignById.get(qualification.campaignId);
    const opportunityId = qualification.opportunityId ?? null;
    const deal = opportunityId
      ? [...uniqueDeals.values()].find((item) => item.opportunityId === opportunityId) ?? null
      : null;
    const revenue = deal ? confirmedRevenueRows.some((item) => item.dealId === deal.id) : false;
    pushRow({
      campaignId: qualification.campaignId,
      campaignName: qualification.campaignName ?? campaign?.name ?? null,
      snapshotId: qualification.snapshotId ?? null,
      snapshotRecipientId: qualification.snapshotRecipientId ?? null,
      recipientFingerprintPreview: redactMarketingFingerprint(qualification.recipientFingerprint),
      qualificationId: qualification.id,
      contactId: qualification.contactId ?? null,
      contactCreated: qualification.contactCreated ?? null,
      opportunityId,
      opportunityCreated: qualification.opportunityCreated ?? null,
      dealId: deal?.id ?? null,
      product: qualification.product ?? campaign?.product ?? null,
      ownerUserId: qualification.assigneeUserId ?? campaign?.routingPlaceholder.ownerUserId ?? null,
      attributedAt: qualification.createdAt,
      stageReached: deepestStage({
        qualificationId: qualification.id,
        qualified: QUALIFIED_STATES.has(qualification.businessState),
        contactId: qualification.contactId ?? null,
        opportunityId,
        dealId: deal?.id ?? null,
        disbursed: Boolean(deal?.disbursedConfirmed),
        revenue,
      }),
      originalCampaignId: qualification.campaignId,
    });
  }

  return {
    sprint: "CO-MARKETING-REDESIGN-017",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    notice: MARKETING_ATTRIBUTION_NOTICE,
    filters,
    chain: [...MARKETING_ATTRIBUTION_STAGES],
    attributedRecipients: availableMarketingMetric(attributedCount),
    qualifiedResponses: availableMarketingMetric(qualifiedCount),
    conversionRate: conversion,
    contactsCreated: availableMarketingMetric(
      uniqueCount(qualifications.filter((row) => row.contactCreated === true).map((row) => row.contactId)),
    ),
    contactsReused: availableMarketingMetric(
      uniqueCount(
        qualifications
          .filter((row) => row.contactId && row.contactCreated === false)
          .map((row) => row.contactId),
      ),
    ),
    opportunitiesCreated: availableMarketingMetric(
      uniqueCount(
        qualifications.filter((row) => row.opportunityCreated === true).map((row) => row.opportunityId),
      ),
    ),
    totalOpportunityValue: hasPersistedOpportunityValue
      ? availableMarketingMetric(persistedOpportunityValue)
      : opportunityIds.length === 0
        ? availableMarketingMetric(0)
        : unavailableMarketingMetric("Unavailable"),
    dealsCreated: availableMarketingMetric(uniqueDeals.size),
    disbursedAmount: hasDisbursed
      ? availableMarketingMetric(disbursedAmount)
      : uniqueDeals.size === 0
        ? availableMarketingMetric(0)
        : unavailableMarketingMetric("Unavailable"),
    recognisedRevenue: revenueMetric,
    campaignCost: hasCost ? availableMarketingMetric(costAmount) : unavailableMarketingMetric("Unavailable"),
    campaignRoi: computeMarketingCampaignRoi({
      cost: hasCost ? costAmount : null,
      recognisedRevenue:
        revenueMetric.availability === "available" && isFiniteNumber(revenueMetric.value)
          ? revenueMetric.value
          : null,
    }),
    rows: [...rowsByKey.values()].sort((a, b) => b.attributedAt.localeCompare(a.attributedAt)),
  };
}

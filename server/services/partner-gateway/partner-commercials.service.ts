/**
 * CO-WP-COM-001 — Partner Commercials & Earnings desk (Catalyst One SSOT projection).
 * Never calculates commission splits, partner share, or payout eligibility in the Gateway.
 * Displays Wealth Partner Commercial Profile, commission structures, and C1-authored earnings only.
 */
import { prisma } from "@server/lib/prisma";
import {
  resolvePartnerBindingForUser,
  PartnerGatewayError,
} from "@server/services/partner-gateway/partner-binding.service";
import { partnerEntitlementsService } from "@server/services/partner-entitlements";
import { partnerOwnershipService } from "@server/services/partner-gateway/partner-ownership.service";
import { wealthPartnerRegistryRepository } from "@server/repositories/wealth-partner-registry";
import { commercialProfileIsConfigured } from "@/lib/enterprise-commercial-participation";
import type {
  PartnerCommercialsDeskDto,
  PartnerCommissionStructureRowDto,
  PartnerEarningsSummaryDto,
  PartnerPeriodEarningsRowDto,
  PartnerTransactionCommercialRowDto,
} from "@/types/enterprise-partner-commercials";

function asProfile(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function readNumber(profile: Record<string, unknown> | null, key: string): number | null {
  if (!profile) return null;
  const v = profile[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function formatInr(amount: number | null): string {
  if (amount === null) return "Not Specified";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${amount}`;
  }
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "Not Specified";
  return `${Number(value)}%`;
}

function payoutFrequencyLabel(raw: string | null | undefined): string {
  const map: Record<string, string> = {
    monthly: "Monthly",
    quarterly: "Quarterly",
    half_yearly: "Half-yearly",
    yearly: "Yearly",
    on_disbursement: "On disbursement",
    other: "Other",
  };
  if (!raw) return "Not Specified";
  return map[raw] || raw;
}

function rateSummary(row: {
  ratePercent: number | null;
  rateBps: number | null;
  flatAmount: number | null;
  structureKind: string;
}): string {
  if (row.ratePercent != null && Number.isFinite(row.ratePercent)) {
    return `${row.ratePercent}%`;
  }
  if (row.rateBps != null && Number.isFinite(row.rateBps)) {
    return `${row.rateBps} bps`;
  }
  if (row.flatAmount != null && Number.isFinite(Number(row.flatAmount))) {
    return formatInr(Number(row.flatAmount));
  }
  if (row.structureKind === "slab") return "Slab schedule (Catalyst One)";
  return "Not Specified";
}

function assertModuleAllowed(
  modules: Record<string, boolean>,
  key: "commercials" | "performance",
) {
  if (modules[key] === false) {
    throw new PartnerGatewayError(
      `Module not entitled: ${key}`,
      "FORBIDDEN",
      403,
    );
  }
}

export const partnerCommercialsService = {
  async getCommercialsDesk(userId: string): Promise<PartnerCommercialsDeskDto> {
    const binding = await resolvePartnerBindingForUser(userId);
    const partner = binding.partner;
    const entitlements = await partnerEntitlementsService.assertEntitlement({
      wealthPartnerId: partner.id,
      organizationId: partner.organizationId,
      action: "view",
    });
    assertModuleAllowed(entitlements.modules, "commercials");

    const row = await prisma.enterpriseWealthPartner.findFirst({
      where: {
        id: partner.id,
        organizationId: partner.organizationId,
        isDeleted: false,
      },
      select: {
        commercialReferralSharePercent: true,
        commercialSoleExecutorSharePercent: true,
        commercialJointExecutorSharePercent: true,
        commercialEffectiveFrom: true,
        commercialStatus: true,
        profileJson: true,
      },
    });

    const profileInput = {
      commercialReferralSharePercent: row?.commercialReferralSharePercent ?? null,
      commercialSoleExecutorSharePercent:
        row?.commercialSoleExecutorSharePercent ?? null,
      commercialJointExecutorSharePercent:
        row?.commercialJointExecutorSharePercent ?? null,
      commercialEffectiveFrom: row?.commercialEffectiveFrom ?? null,
      commercialStatus: row?.commercialStatus ?? "active",
    };

    const terms = {
      commercialStatus: profileInput.commercialStatus || "active",
      commercialEffectiveFrom: profileInput.commercialEffectiveFrom
        ? new Date(profileInput.commercialEffectiveFrom).toISOString()
        : null,
      referralSharePercentLabel: formatPercent(
        profileInput.commercialReferralSharePercent,
      ),
      soleExecutorSharePercentLabel: formatPercent(
        profileInput.commercialSoleExecutorSharePercent,
      ),
      jointExecutorSharePercentLabel: formatPercent(
        profileInput.commercialJointExecutorSharePercent,
      ),
      configured: commercialProfileIsConfigured(profileInput),
      dtoSource: "enterprise_wealth_partner_commercial" as const,
    };

    const structuresRaw = await wealthPartnerRegistryRepository.listCommissions(
      partner.organizationId,
      partner.id,
    );
    const commissionStructures: PartnerCommissionStructureRowDto[] = structuresRaw.map(
      (s) => ({
        structureId: s.id,
        code: s.code,
        label: s.label,
        productLabel: s.productLabel,
        structureKind: s.structureKind,
        rateSummaryLabel: rateSummary(s),
        payoutFrequencyLabel: payoutFrequencyLabel(s.payoutFrequency),
        effectiveFrom: s.effectiveFrom,
        effectiveUntil: s.effectiveUntil,
        statusLabel: s.enabled === false ? "Disabled" : s.status || "Active",
        dtoSource: "enterprise_wealth_partner_commercial",
      }),
    );

    const profile = asProfile(row?.profileJson ?? partner.profileJson);
    const current = readNumber(profile, "commissionEarnedMtd");
    const pending = readNumber(profile, "commissionPending");
    const paid =
      readNumber(profile, "commissionPaidMtd") ??
      readNumber(profile, "commissionReceivedMtd") ??
      readNumber(profile, "commissionReceived");
    const earningsAvailable =
      current !== null || pending !== null || paid !== null;

    const earnings: PartnerEarningsSummaryDto = {
      currentEarningsLabel: formatInr(current),
      pendingEarningsLabel: formatInr(pending),
      paidEarningsLabel: formatInr(paid),
      periodLabel: "This month (Catalyst One projection)",
      available: earningsAvailable,
      emptyMessage: earningsAvailable
        ? null
        : "Earnings figures appear when Catalyst One projects commission amounts for your partner identity. No demo values are shown.",
      dtoSource: "enterprise_partner_earnings_projection",
    };

    // Period earnings — only if C1 authored an array on profileJson (never invent).
    const periodRaw = profile?.periodEarnings;
    const periodEarnings: PartnerPeriodEarningsRowDto[] = Array.isArray(periodRaw)
      ? periodRaw
          .filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === "object")
          .slice(0, 24)
          .map((p, i) => ({
            periodKey: String(p.periodKey || p.key || `period-${i}`),
            periodLabel: String(p.periodLabel || p.label || "Period"),
            amountLabel:
              typeof p.amountLabel === "string"
                ? p.amountLabel
                : formatInr(
                    typeof p.amount === "number" ? p.amount : readNumber(p, "amount"),
                  ),
            statusLabel: String(p.statusLabel || p.status || "Projected"),
            dtoSource: "enterprise_partner_earnings_projection" as const,
          }))
      : [];

    const owned = await partnerOwnershipService.listOwnedOpportunities({
      organizationId: partner.organizationId,
      wealthPartnerId: partner.id,
      limit: 100,
    });

    // Transaction commercial stamp — Opportunity Registry field only (no Partner calc).
    const oppRows = await prisma.enterpriseOpportunity.findMany({
      where: {
        organizationId: partner.organizationId,
        isDeleted: false,
        sourceWealthPartnerId: partner.id,
        id: { in: owned.map((o) => o.id) },
      },
      select: {
        id: true,
        opportunityNumber: true,
        primaryContactName: true,
        companyName: true,
        productLabel: true,
        commercialRevenueSharePercent: true,
        lifecycleStatus: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    const payoutMapRaw = profile?.opportunityPayoutStatus;
    const payoutByOpp =
      payoutMapRaw && typeof payoutMapRaw === "object" && !Array.isArray(payoutMapRaw)
        ? (payoutMapRaw as Record<string, unknown>)
        : null;
    const transactionCommercials: PartnerTransactionCommercialRowDto[] = oppRows.map(
      (o) => {
        const payoutRaw =
          payoutByOpp && typeof payoutByOpp[o.id] === "string"
            ? String(payoutByOpp[o.id])
            : null;
        return {
          opportunityId: o.id,
          reference: o.opportunityNumber,
          customerDisplayName:
            o.primaryContactName || o.companyName || "Not Specified",
          productLabel: o.productLabel || "Not Specified",
          commercialSharePercentLabel: formatPercent(o.commercialRevenueSharePercent),
          commercialStatusLabel:
            o.commercialRevenueSharePercent != null
              ? "Commercial stamped"
              : "Not Specified",
          payoutStatusLabel: payoutRaw || "Not Specified",
          updatedAt: o.updatedAt.toISOString(),
          dtoSource: "enterprise_wealth_partner_commercial",
        };
      },
    );

    return {
      partnerId: partner.id,
      title: "Commercials",
      subtitle: "Commercial terms and earnings projected by Catalyst One for your partner identity.",
      dtoNotice:
        "Commission calculations originate only in Catalyst One. Catalyst Connect displays projected values and never recalculates splits, shares, or payout eligibility.",
      entitlements: {
        executionMode: entitlements.executionMode,
        moduleAllowed: true,
      },
      terms,
      commissionStructures,
      earnings,
      transactionCommercials,
      periodEarnings,
      emptyStates: {
        structures: {
          title: "No commission structures",
          message:
            "Product and payout structures configured for your Wealth Partner in Catalyst One will appear here.",
        },
        transactions: {
          title: "No transaction commercials",
          message:
            "When Opportunities you sourced have commercial stamps or payout status from Catalyst One, they will list here.",
        },
        periodEarnings: {
          title: "No period earnings",
          message:
            "Period-wise earnings appear only when Catalyst One projects them for your partner identity.",
        },
      },
      dtoSource: "enterprise_wealth_partner_commercial",
    };
  },
};

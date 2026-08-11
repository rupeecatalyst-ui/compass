/**
 * CO-WP-COM-001 — Partner Performance desk (Catalyst One SSOT projection).
 * Reuses owned Opportunity inventory + C1-authored targets from Wealth Partner profile.
 * Does not invent rankings, conversion formulas, or a second performance engine.
 */
import { prisma } from "@server/lib/prisma";
import {
  resolvePartnerBindingForUser,
  PartnerGatewayError,
} from "@server/services/partner-gateway/partner-binding.service";
import { partnerEntitlementsService } from "@server/services/partner-entitlements";
import { partnerOwnershipService } from "@server/services/partner-gateway/partner-ownership.service";
import type { PartnerPerformanceDeskDto } from "@/types/enterprise-partner-commercials";

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

function isClosedLifecycle(lifecycleStatus: string): boolean {
  const life = (lifecycleStatus || "").toLowerCase();
  return (
    life === "won" ||
    life === "lost" ||
    life === "disbursed" ||
    life === "closed" ||
    life === "cancelled"
  );
}

export const partnerPerformanceService = {
  async getPerformanceDesk(userId: string): Promise<PartnerPerformanceDeskDto> {
    const binding = await resolvePartnerBindingForUser(userId);
    const partner = binding.partner;
    const entitlements = await partnerEntitlementsService.assertEntitlement({
      wealthPartnerId: partner.id,
      organizationId: partner.organizationId,
      action: "view",
    });
    if (entitlements.modules.performance === false) {
      throw new PartnerGatewayError("Module not entitled: performance", "FORBIDDEN", 403);
    }

    const row = await prisma.enterpriseWealthPartner.findFirst({
      where: {
        id: partner.id,
        organizationId: partner.organizationId,
        isDeleted: false,
      },
      select: { profileJson: true },
    });
    const profile = asProfile(row?.profileJson ?? partner.profileJson);

    const owned = await partnerOwnershipService.listOwnedOpportunities({
      organizationId: partner.organizationId,
      wealthPartnerId: partner.id,
      limit: 200,
    });

    const open = owned.filter((o) => !isClosedLifecycle(o.lifecycleStatus));
    const closed = owned.filter((o) => isClosedLifecycle(o.lifecycleStatus));

    const target = readNumber(profile, "monthlyTargetAmount");
    const achieved =
      readNumber(profile, "monthlyAchievedAmount") ??
      readNumber(profile, "monthlyBusinessAmount");
    const businessVolume =
      readNumber(profile, "monthlyBusinessAmount") ??
      readNumber(profile, "businessVolumeMtd");
    const conversion = readNumber(profile, "conversionRatePercent");

    // Achievement % only when both values authored by Catalyst One (same as Home snapshot).
    const achievementPercent =
      target != null && target > 0 && achieved != null
        ? Math.max(0, Math.min(100, Math.round((achieved / target) * 100)))
        : null;

    const metrics = [
      {
        id: "target",
        label: "Monthly target",
        valueLabel: formatInr(target),
        hint: target == null ? "Configured in Catalyst One target architecture" : null,
        available: target != null,
      },
      {
        id: "achievement",
        label: "Achievement",
        valueLabel:
          achievementPercent != null
            ? `${achievementPercent}%`
            : achieved != null
              ? formatInr(achieved)
              : "Not Specified",
        hint:
          achievementPercent != null
            ? `Achieved ${formatInr(achieved)} of ${formatInr(target)}`
            : "Appears when Catalyst One projects target and achievement",
        available: achievementPercent != null || achieved != null,
      },
      {
        id: "pipeline",
        label: "Open pipeline",
        valueLabel: String(open.length),
        hint: `${owned.length} total sourced Opportunities`,
        available: true,
      },
      {
        id: "business_volume",
        label: "Business volume",
        valueLabel: formatInr(businessVolume),
        hint: businessVolume == null ? "Not Specified until projected by Catalyst One" : null,
        available: businessVolume != null,
      },
      {
        id: "conversion",
        label: "Conversion",
        valueLabel:
          conversion != null && Number.isFinite(conversion)
            ? `${conversion}%`
            : "Not Specified",
        hint: "Shown only when Catalyst One provides partner conversion",
        available: conversion != null,
      },
    ];

    // Product mix — inventory counts from owned Opportunities (Registry projection, not a score engine).
    const mixMap = new Map<string, number>();
    for (const o of owned) {
      const label = (o.productLabel || "Not Specified").trim() || "Not Specified";
      mixMap.set(label, (mixMap.get(label) || 0) + 1);
    }
    const totalMix = owned.length || 1;
    const productMix = [...mixMap.entries()]
      .map(([productLabel, opportunityCount]) => ({
        productLabel,
        opportunityCount,
        sharePercentLabel: `${Math.round((opportunityCount / totalMix) * 100)}%`,
      }))
      .sort((a, b) => b.opportunityCount - a.opportunityCount)
      .slice(0, 12);

    const currentPeriod = readNumber(profile, "periodCurrentAmount");
    const priorPeriod = readNumber(profile, "periodPriorAmount");
    const periodAvailable = currentPeriod != null || priorPeriod != null;
    let deltaLabel = "Not Specified";
    if (currentPeriod != null && priorPeriod != null) {
      const delta = currentPeriod - priorPeriod;
      const sign = delta > 0 ? "+" : "";
      deltaLabel = `${sign}${formatInr(delta)}`;
    }

    return {
      partnerId: partner.id,
      title: "Performance",
      subtitle: "Partner-scoped performance projected from Catalyst One.",
      dtoNotice:
        "Targets and achievement originate from Catalyst One. Pipeline and product mix are inventory projections of Opportunities you sourced — not a second performance engine.",
      entitlements: {
        executionMode: entitlements.executionMode,
        moduleAllowed: true,
      },
      metrics,
      pipeline: {
        openCount: open.length,
        closedCount: closed.length,
        totalCount: owned.length,
      },
      productMix,
      periodComparison: {
        available: periodAvailable,
        currentPeriodLabel: String(profile?.periodCurrentLabel || "Current period"),
        priorPeriodLabel: String(profile?.periodPriorLabel || "Prior period"),
        currentValueLabel: formatInr(currentPeriod),
        priorValueLabel: formatInr(priorPeriod),
        deltaLabel,
        emptyMessage: periodAvailable
          ? null
          : "Period comparison appears when Catalyst One projects current and prior period values.",
      },
      emptyStates: {
        productMix: {
          title: "No product mix yet",
          message:
            "Product mix is derived from Opportunities you sourced in Catalyst One. Create or source Opportunities to see mix here.",
        },
      },
      dtoSource: "enterprise_partner_performance_projection",
    };
  },
};

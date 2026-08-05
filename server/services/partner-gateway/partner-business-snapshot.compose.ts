/**
 * CO-WP-HOME-SNAPSHOT-001 — Compose Business Snapshot cards from enterprise projections.
 * No companion math — counts and profile commercials only (CAD-honest labels).
 */

import type { PartnerOpportunityDetailDto } from "@/types/enterprise-partner-business";
import type { PartnerHomeBusinessSnapshotDto } from "@/types/enterprise-partner-business-snapshot";

export const PARTNER_BUSINESS_SNAPSHOT_VERSION = "CO-WP-HOME-SNAPSHOT-001";

function isClosed(detail: PartnerOpportunityDetailDto): boolean {
  const life = (detail.lifecycleStatus || "").toLowerCase();
  const stage = (detail.stageLabel || "").toLowerCase();
  return (
    life === "won" ||
    life === "lost" ||
    life === "disbursed" ||
    life === "closed" ||
    stage.includes("disbursed") ||
    stage.includes("lost")
  );
}

function readProfileNumber(profile: Record<string, unknown> | null | undefined, key: string): number | null {
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

function countPendingDocuments(open: PartnerOpportunityDetailDto[]): number {
  let count = 0;
  for (const o of open) {
    if (o.lod?.ready && o.lod.summary.missing > 0) {
      count += o.lod.summary.missing;
      continue;
    }
    count += (o.missingItems ?? []).filter((m) => m !== "Loan Amount").length;
  }
  return count;
}

function countFollowUpsDue(open: PartnerOpportunityDetailDto[]): number {
  let count = 0;
  for (const o of open) {
    count += (o.upcomingTasks ?? []).length;
  }
  if (count > 0) return count;
  for (const o of open) {
    for (const a of o.activities ?? []) {
      if (/follow|call|meeting/i.test(a.kindLabel) || /follow/i.test(a.title)) count += 1;
    }
  }
  return count;
}

export function composePartnerBusinessSnapshot(input: {
  opportunities: PartnerOpportunityDetailDto[];
  customerCount: number;
  partnerProfileJson?: Record<string, unknown> | null;
}): PartnerHomeBusinessSnapshotDto {
  const open = input.opportunities.filter((o) => !isClosed(o));
  const profile = input.partnerProfileJson ?? null;

  const pendingDocs = countPendingDocuments(open);
  const followUps = countFollowUpsDue(open);
  const earned = readProfileNumber(profile, "commissionEarnedMtd");
  const pending = readProfileNumber(profile, "commissionPending");
  const monthlyBusiness =
    readProfileNumber(profile, "monthlyBusinessAmount") ??
    readProfileNumber(profile, "monthlyAchievedAmount");
  const target = readProfileNumber(profile, "monthlyTargetAmount");
  const achieved = readProfileNumber(profile, "monthlyAchievedAmount");
  const percent =
    target && target > 0 && achieved !== null
      ? Math.max(0, Math.min(100, Math.round((achieved / target) * 100)))
      : null;

  return {
    version: PARTNER_BUSINESS_SNAPSHOT_VERSION,
    dtoSource: "enterprise_partner_business_snapshot",
    title: "Business Snapshot",
    periodLabel: "This month",
    dtoNotice:
      "Premium Business Snapshot projected by Catalyst One. Values show Not Specified until Enterprise commercials or counts are available.",
    cards: [
      {
        id: "active_opportunities",
        label: "Active Opportunities",
        valueLabel: String(open.length),
        hint: open.length === 1 ? "Open in pipeline" : "Open in pipeline",
        deepLink: "/app/business",
        tone: "accent",
      },
      {
        id: "pending_documents",
        label: "Pending Documents",
        valueLabel: String(pendingDocs),
        hint: pendingDocs > 0 ? "Needs partner action" : "All clear",
        deepLink: "/app/business",
        tone: pendingDocs > 0 ? "warning" : "default",
      },
      {
        id: "monthly_business",
        label: "Monthly Business",
        valueLabel: formatInr(monthlyBusiness),
        hint:
          monthlyBusiness === null
            ? "Awaiting Enterprise commercial projection"
            : "Enterprise monthly business",
        deepLink: "/app/business",
        tone: "default",
      },
      {
        id: "expected_commission",
        label: "Expected Commission",
        valueLabel: formatInr(pending),
        hint: pending === null ? "Not Specified until commercials publish" : "Pending release",
        deepLink: "/app/business",
        tone: "default",
      },
      {
        id: "commission_received",
        label: "Commission Received",
        valueLabel: formatInr(earned),
        hint: earned === null ? "Not Specified until commercials publish" : "MTD earned",
        deepLink: "/app/business",
        tone: "success",
      },
      {
        id: "target_achievement",
        label: "Target Achievement",
        valueLabel: percent === null ? "Not Specified" : `${percent}%`,
        hint:
          target === null
            ? "Target publishes from Enterprise partner config"
            : `${formatInr(achieved)} of ${formatInr(target)}`,
        deepLink: "/app/business",
        tone: percent !== null && percent >= 80 ? "success" : "accent",
      },
      {
        id: "customer_count",
        label: "Customer Count",
        valueLabel: String(Math.max(0, input.customerCount)),
        hint: "Enterprise Customer Registry",
        deepLink: "/app/customers",
        tone: "default",
      },
      {
        id: "follow_ups_due",
        label: "Follow-ups Due",
        valueLabel: String(followUps),
        hint: followUps > 0 ? "Due today / upcoming" : "None due",
        deepLink: "/app/business",
        tone: followUps > 0 ? "warning" : "default",
      },
    ],
  };
}

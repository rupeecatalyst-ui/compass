/**
 * CO-WP-COMMAND-001 — Compose Partner Command Center from enterprise projections.
 * No decorative invent — actionable items only from Opportunity / LOD / activities.
 */

import type { PartnerOpportunityDetailDto } from "@/types/enterprise-partner-business";
import type { PartnerCommandCenterDto } from "@/types/enterprise-partner-command-center";

export const PARTNER_COMMAND_CENTER_VERSION = "CO-WP-COMMAND-001";

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

function urgencyFor(detail: PartnerOpportunityDetailDto): string {
  const missing = (detail.missingItems ?? []).filter((m) => m !== "Loan Amount");
  if (missing.length >= 3 || detail.opportunityHealthLabel?.toLowerCase().includes("risk")) {
    return "Urgent";
  }
  if (missing.length > 0 || detail.lifecycleStatus === "draft") return "Today";
  return "Soon";
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

export function composePartnerCommandCenter(input: {
  opportunities: PartnerOpportunityDetailDto[];
  partnerProfileJson?: Record<string, unknown> | null;
  givenName?: string;
}): PartnerCommandCenterDto {
  const open = input.opportunities.filter((o) => !isClosed(o));

  const opportunitiesRequiringAction = open
    .filter((o) => o.nextBestAction || (o.missingItems?.length ?? 0) > 0 || o.lifecycleStatus === "draft")
    .sort((a, b) => {
      const ua = urgencyFor(a) === "Urgent" ? 0 : urgencyFor(a) === "Today" ? 1 : 2;
      const ub = urgencyFor(b) === "Urgent" ? 0 : urgencyFor(b) === "Today" ? 1 : 2;
      return ua - ub || (a.updatedAt < b.updatedAt ? 1 : -1);
    })
    .slice(0, 8)
    .map((o) => ({
      id: `opp-action-${o.opportunityId}`,
      title: o.nextBestAction?.title || `Continue ${o.reference}`,
      subtitle: `${o.customerDisplayName} · ${o.productLabel} · ${o.businessTimeline?.currentLabel || o.stageLabel}`,
      urgencyLabel: urgencyFor(o),
      ctaLabel: o.nextBestAction?.ctaLabel || "Open",
      ctaDeepLink:
        o.nextBestAction?.ctaDeepLink || `/app/opportunities/${o.opportunityId}`,
    }));

  const pendingDocuments = open.flatMap((o) => {
    const labels =
      o.lod?.ready && o.lod.summary.missing > 0
        ? o.lod.items
            .filter(
              (i) =>
                i.missing ||
                i.status === "missing" ||
                i.status === "rejected" ||
                i.status === "re_upload_required" ||
                i.status === "pending_verification",
            )
            .map((i) => i.label)
        : (o.missingItems ?? []).filter((m) => m !== "Loan Amount");
    return labels.slice(0, 4).map((label, idx) => ({
      id: `doc-${o.opportunityId}-${idx}`,
      title: label.startsWith("Upload") ? label : `Upload ${label}`,
      subtitle: `${o.customerDisplayName} · ${o.reference}`,
      urgencyLabel: urgencyFor(o),
      ctaLabel: "Open Documents",
      ctaDeepLink: `/app/opportunities/${o.opportunityId}/documents`,
    }));
  }).slice(0, 8);

  const todaysFollowUps = open.flatMap((o) =>
    (o.upcomingTasks ?? []).slice(0, 3).map((t, idx) => ({
      id: t.taskId || `fu-${o.opportunityId}-${idx}`,
      title: t.title,
      subtitle: `${o.customerDisplayName} · ${t.dueLabel || "Today"}`,
      urgencyLabel: "Today",
      ctaLabel: "Open Opportunity",
      ctaDeepLink: `/app/opportunities/${o.opportunityId}`,
    })),
  ).slice(0, 8);

  // If no ETE tasks, surface follow-up-shaped activities
  if (todaysFollowUps.length === 0) {
    for (const o of open) {
      for (const a of o.activities ?? []) {
        if (!/follow|call|meeting/i.test(a.kindLabel) && !/follow/i.test(a.title)) continue;
        todaysFollowUps.push({
          id: a.activityId,
          title: a.title,
          subtitle: `${o.customerDisplayName} · ${a.kindLabel}`,
          urgencyLabel: "Today",
          ctaLabel: "Open",
          ctaDeepLink: `/app/opportunities/${o.opportunityId}`,
        });
        if (todaysFollowUps.length >= 8) break;
      }
      if (todaysFollowUps.length >= 8) break;
    }
  }

  const todaysPriority =
    opportunitiesRequiringAction[0]
      ? {
          title: opportunitiesRequiringAction[0].title,
          reason: opportunitiesRequiringAction[0].subtitle,
          ctaLabel: opportunitiesRequiringAction[0].ctaLabel,
          ctaDeepLink: opportunitiesRequiringAction[0].ctaDeepLink,
        }
      : pendingDocuments[0]
        ? {
            title: pendingDocuments[0].title,
            reason: pendingDocuments[0].subtitle,
            ctaLabel: pendingDocuments[0].ctaLabel,
            ctaDeepLink: pendingDocuments[0].ctaDeepLink,
          }
        : null;

  const profile = input.partnerProfileJson ?? null;
  const earned = readProfileNumber(profile, "commissionEarnedMtd");
  const pending = readProfileNumber(profile, "commissionPending");
  const target = readProfileNumber(profile, "monthlyTargetAmount");
  const achieved = readProfileNumber(profile, "monthlyAchievedAmount");
  const percent =
    target && target > 0 && achieved !== null
      ? Math.max(0, Math.min(100, Math.round((achieved / target) * 100)))
      : 0;

  const aiSuggestions: PartnerCommandCenterDto["aiSuggestions"] = [];
  if (pendingDocuments.length > 0) {
    aiSuggestions.push({
      id: "ai-docs",
      title: "Clear pending documents first",
      subtitle: `${pendingDocuments.length} document action${pendingDocuments.length === 1 ? "" : "s"} waiting — customers move faster when LOD is complete.`,
      urgencyLabel: "Suggestion",
      ctaLabel: "Review documents",
      ctaDeepLink: pendingDocuments[0]!.ctaDeepLink,
    });
  }
  if (open.some((o) => o.lifecycleStatus === "draft")) {
    const draft = open.find((o) => o.lifecycleStatus === "draft")!;
    aiSuggestions.push({
      id: "ai-draft",
      title: "Submit draft opportunities",
      subtitle: `${draft.reference} is still a draft — submit when requirements are ready.`,
      urgencyLabel: "Suggestion",
      ctaLabel: "Open draft",
      ctaDeepLink: `/app/opportunities/${draft.opportunityId}`,
    });
  }
  if (aiSuggestions.length === 0 && open.length === 0) {
    aiSuggestions.push({
      id: "ai-start",
      title: "Start your next customer Opportunity",
      subtitle: input.givenName
        ? `${input.givenName}, create an Opportunity to begin today's work.`
        : "Create an Opportunity to begin today's work.",
      urgencyLabel: "Suggestion",
      ctaLabel: "New Opportunity",
      ctaDeepLink: "/app/opportunities/new",
    });
  } else if (aiSuggestions.length === 0) {
    aiSuggestions.push({
      id: "ai-pipeline",
      title: "Review your Business Pipeline",
      subtitle: "Check buckets that need partner attention today.",
      urgencyLabel: "Suggestion",
      ctaLabel: "Open Business",
      ctaDeepLink: "/app/business",
    });
  }

  const recentActivity = open
    .flatMap((o) =>
      (o.activities ?? []).map((a) => ({
        id: a.activityId,
        title: a.title,
        body: `${o.customerDisplayName} · ${a.kindLabel}`,
        occurredAt: a.occurredAt,
        deepLink: `/app/opportunities/${o.opportunityId}` as string | null,
      })),
    )
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
    .slice(0, 8);

  if (recentActivity.length === 0) {
    for (const o of open.slice(0, 5)) {
      recentActivity.push({
        id: `upd-${o.opportunityId}`,
        title: `${o.reference} updated`,
        body: `${o.customerDisplayName} · ${o.businessTimeline?.currentLabel || o.stageLabel}`,
        occurredAt: o.updatedAt,
        deepLink: `/app/opportunities/${o.opportunityId}`,
      });
    }
    recentActivity.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  }

  return {
    version: PARTNER_COMMAND_CENTER_VERSION,
    dtoSource: "enterprise_partner_command_center",
    dtoNotice:
      "Partner Command Center — your next best action from Catalyst One. Business Snapshot cards sit below for a premium glance.",
    guidingQuestion: "What should I do next?",
    todaysPriority,
    opportunitiesRequiringAction,
    pendingDocuments,
    todaysFollowUps,
    commissionSnapshot: {
      periodLabel: "This month",
      earnedLabel: formatInr(earned),
      pendingLabel: formatInr(pending),
      notice:
        earned === null && pending === null
          ? "Commission figures appear when Enterprise commercial projections are available for your partner profile."
          : "Projected from Enterprise Wealth Partner commercials.",
      deepLink: "/app/business",
    },
    monthlyTargetProgress: {
      periodLabel: "This month",
      targetLabel: formatInr(target),
      achievedLabel: formatInr(achieved),
      percent,
      notice:
        target === null
          ? "Monthly target progress appears when your enterprise target is published."
          : "Projected from Enterprise partner target configuration.",
      deepLink: "/app/business",
    },
    aiSuggestions: aiSuggestions.slice(0, 4),
    recentActivity: recentActivity.slice(0, 8),
    quickActions: [
      { id: "qa-new-opp", label: "New Opportunity", deepLink: "/app/opportunities/new" },
      { id: "qa-business", label: "My Business", deepLink: "/app/business" },
      { id: "qa-customers", label: "Customers", deepLink: "/app/customers" },
      { id: "qa-identity", label: "Identity Card", deepLink: "/app/identity" },
    ],
  };
}

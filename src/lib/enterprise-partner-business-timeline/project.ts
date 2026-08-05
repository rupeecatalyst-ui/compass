/**
 * CO-WP-TIMELINE-001 — Project partner-friendly Opportunity timeline.
 * Hides Credit Workbench / internal workflow stages from Wealth Partners.
 */

import {
  PARTNER_BUSINESS_MILESTONE_DEFS,
  PARTNER_BUSINESS_TIMELINE_VERSION,
} from "@/constants/enterprise-partner-business-timeline";
import type { PartnerOpportunityDetailDto } from "@/types/enterprise-partner-business";
import type {
  PartnerBusinessMilestoneId,
  PartnerBusinessTimelineDto,
} from "@/types/enterprise-partner-business-timeline";

const DTO_SOURCE = "enterprise_partner_business_timeline" as const;
const DTO_NOTICE =
  "Partner business progress timeline. Internal enterprise workflow stages are never exposed.";

const ORDER: Record<PartnerBusinessMilestoneId, number> = {
  opportunity_created: 10,
  documents_pending: 20,
  documents_complete: 30,
  submitted: 40,
  under_review: 50,
  sent_to_lender: 60,
  decision_received: 70,
  disbursed: 80,
};

function hasOpenDocuments(detail: PartnerOpportunityDetailDto): boolean {
  if (detail.lod?.ready) {
    return detail.lod.summary.missing > 0 || detail.lod.summary.rejected > 0;
  }
  const missingDocs = (detail.missingItems ?? []).filter((m) => m !== "Loan Amount");
  if (missingDocs.length > 0) return true;
  const summary = detail.documentStatusSummary;
  if (summary && summary.required > 0) {
    return summary.uploaded < summary.required || summary.rejected > 0;
  }
  return (detail.documents ?? []).length === 0;
}

function hasAnyDocuments(detail: PartnerOpportunityDetailDto): boolean {
  if (detail.lod?.ready) return detail.lod.summary.uploaded > 0;
  if ((detail.documentStatusSummary?.uploaded ?? 0) > 0) return true;
  return (detail.documents ?? []).length > 0;
}

/**
 * Resolve the furthest partner-visible milestone from Opportunity projection fields.
 * Never surfaces credit/risk/policy internals.
 */
export function resolvePartnerBusinessMilestoneId(
  detail: PartnerOpportunityDetailDto,
): PartnerBusinessMilestoneId {
  const stage = (detail.stageLabel || "").toLowerCase();
  const life = (detail.lifecycleStatus || "").toLowerCase();
  const docsOpen = hasOpenDocuments(detail);

  if (stage.includes("disburs") || life === "disbursed" || life === "won") {
    return "disbursed";
  }
  if (
    stage.includes("sanction") ||
    stage.includes("decision") ||
    stage.includes("approved") ||
    stage.includes("ready for disbursement")
  ) {
    return "decision_received";
  }
  if (stage.includes("sent to lender") || stage.includes("lender login")) {
    return "sent_to_lender";
  }
  if (stage.includes("credit") || stage.includes("under review")) {
    return "under_review";
  }
  if (
    life === "active" ||
    life === "submitted" ||
    life === "on_hold" ||
    stage.includes("requirement captured") ||
    stage === "submitted"
  ) {
    return "submitted";
  }
  if (stage.includes("document")) {
    return docsOpen ? "documents_pending" : "documents_complete";
  }
  // Draft / early capture
  if (docsOpen) return "documents_pending";
  if (hasAnyDocuments(detail)) return "documents_complete";
  return "opportunity_created";
}

export function projectPartnerBusinessTimeline(
  detail: PartnerOpportunityDetailDto,
): PartnerBusinessTimelineDto {
  const currentId = resolvePartnerBusinessMilestoneId(detail);
  const currentOrder = ORDER[currentId];
  const docsOpen = hasOpenDocuments(detail);

  const milestones = PARTNER_BUSINESS_MILESTONE_DEFS.map((def) => {
    let state: "completed" | "current" | "upcoming";
    if (def.id === currentId) {
      state = "current";
    } else if (def.sortOrder < currentOrder) {
      state = "completed";
    } else {
      state = "upcoming";
    }

    // If we skipped past documents_pending while docs are still open, keep that milestone current.
    // (Should not happen with resolve logic, but keeps UI honest.)
    if (def.id === "documents_pending" && docsOpen && currentOrder > ORDER.documents_pending) {
      // Past stages already imply docs were accepted for partner view — leave completed.
    }

    // When current is documents_complete or later, documents_pending is always completed.
    if (def.id === "documents_pending" && currentOrder >= ORDER.documents_complete) {
      state = def.id === currentId ? "current" : "completed";
    }

    const reachedAt =
      state === "upcoming"
        ? null
        : def.id === "opportunity_created"
          ? detail.createdAt || null
          : detail.updatedAt || detail.createdAt || null;

    return {
      id: def.id,
      label: def.label,
      description: def.description,
      state,
      sortOrder: def.sortOrder,
      reachedAt,
    };
  });

  // Exactly one current
  let seenCurrent = false;
  for (const m of milestones) {
    if (m.state === "current") {
      if (seenCurrent) m.state = "completed";
      else seenCurrent = true;
    }
  }
  if (!seenCurrent) {
    const hit = milestones.find((m) => m.id === currentId);
    if (hit) hit.state = "current";
  }

  const current = milestones.find((m) => m.state === "current") || milestones[0]!;

  return {
    version: PARTNER_BUSINESS_TIMELINE_VERSION,
    dtoSource: DTO_SOURCE,
    dtoNotice: DTO_NOTICE,
    currentLabel: current.label,
    currentDescription: current.description,
    milestones,
  };
}

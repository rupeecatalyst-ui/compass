/**
 * CO-WP-INT-001 — Partner Opportunity / Deal operational integration.
 *
 * Authorization & business SSOT: Enterprise Opportunity Registry (sourceWealthPartnerId).
 * Placeholder store: presentation enrichment only — never authorizes and never wins over Registry writes.
 */
import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import { Prisma } from "@prisma/client";
import { normalizeEcmMobile } from "@/lib/enterprise-contact-master";
import {
  ecmCanonicalMobilePrimary,
  ecmContactRepository,
  ecmMobileLookupCandidates,
} from "@server/repositories/ecm/contact.repository";
import type {
  PartnerBusinessHubDto,
  PartnerBusinessPipelineBucketId,
  PartnerBusinessPipelineDto,
  PartnerBusinessPipelineOpportunityRowDto,
  PartnerCustomerSearchHitDto,
  PartnerOpportunityActivityDto,
  PartnerOpportunityCreateInput,
  PartnerOpportunityDetailDto,
  PartnerOpportunityDocumentDto,
  PartnerOpportunityDocumentUploadInput,
  PartnerOpportunityLoanFileViewDto,
  PartnerOpportunityPatchInput,
  PartnerOpportunitySummaryDto,
  PartnerOpportunityTimelineEventDto,
} from "@/types/enterprise-partner-business";
import type {
  PartnerCustomerDirectoryDto,
  PartnerCustomerWorkspaceDto,
} from "@/types/enterprise-partner-customer-workspace";
import { assertOpportunityPrimaryBorrowerKind } from "@/constants/opportunity-primary-borrower";
import {
  PARTNER_BUSINESS_PIPELINE_BUCKETS,
  PARTNER_BUSINESS_PIPELINE_EMPTY_STATES,
  PARTNER_BUSINESS_PIPELINE_FILTERS,
  PARTNER_BUSINESS_PIPELINE_META,
  PARTNER_BUSINESS_PIPELINE_PRIORITY_KINDS,
  PARTNER_BUSINESS_PIPELINE_QUICK_ACTIONS,
} from "@/constants/enterprise-partner-business-pipeline";
import { projectPartnerBusinessTimeline } from "@/lib/enterprise-partner-business-timeline";
import {
  composePartnerCustomerWorkspace,
  loadEcmContactForPartner,
} from "./partner-customer-workspace.compose";
import { buildPartnerOpportunityJourneyConfig } from "./partner-opportunity-journey-config.service";
import {
  invalidatePartnerPipelineCache,
  readPartnerPipelineCache,
  writePartnerPipelineCache,
} from "./partner-pipeline-cache";
import { memoPartnerPipeline } from "./partner-request-memo";
import {
  listPartnerLodMissingLabels,
  projectPartnerOpportunityLod,
} from "@/lib/enterprise-partner-lod";
import {
  createUnclassifiedDocumentTypeRef,
  isUnclassifiedDocumentTypeRef,
} from "@/constants/document-intake";
import {
  PartnerGatewayError,
  resolvePartnerBindingForUser,
} from "./partner-binding.service";
import { partnerEntitlementsService } from "@server/services/partner-entitlements";
import { partnerOwnershipService, type OwnedOpportunityRow } from "@server/services/partner-gateway/partner-ownership.service";
import { enterpriseOpportunityRepository } from "@server/repositories/enterprise-opportunity";
import { enterpriseBusinessNotesService } from "@server/services/enterprise-business-notes/enterprise-business-notes.service";
import {
  listPartnerOpportunityDocuments,
  listPartnerVisibleOpportunityNotes,
  softDeletePartnerOpportunityDocument,
  upsertPartnerOpportunityDocument,
} from "@server/services/partner-gateway/partner-ssot-projections";
import { partnerDealService } from "@server/services/partner-gateway/partner-deal.service";
import { listProjectedLendersForOpportunity } from "@server/services/partner-gateway/partner-opportunity-lenders.service";
import { enterpriseActivityService } from "@server/services/enterprise-activity/enterprise-activity.service";
import { EAR_EVENT_KINDS, EAR_SOURCE_SYSTEMS } from "@/constants/enterprise-activity-registry";
import { isApproxCibilScoreBand } from "@/constants/cibil-score-master";
import type { PartnerEntitlementAction } from "@/constants/enterprise-partner-entitlements";
import type { PartnerEffectiveEntitlements } from "@/types/enterprise-partner-entitlements";

const DTO_SOURCE = "placeholder_partner_business" as const;
const DTO_NOTICE =
  "Partner projection enriched for Connect UX — Opportunity Registry remains the business SSOT.";

/** CO-WP-BAT-004 — Durable placeholder slice inside Wealth Partner profileJson. */
const PLACEHOLDER_PROFILE_KEY = "partnerBusinessPlaceholder" as const;

/** Named Enterprise Events owned by Catalyst One (projection until Registry cutover). */
function emitEnterpriseSubmitEvents(detail: PartnerOpportunityDetailDto): void {
  const events = buildPartnerOpportunityJourneyConfig().enterpriseEventsOnSubmit;
  for (const title of events) {
    pushTimeline(
      detail,
      title,
      "Enterprise event reserved for Catalyst One engines (Registry · Workflow · Notification · Activity · Mission Control).",
    );
  }
    // Internal engine fan-out stays on enterprise timeline only.
}
type Store = {
  opportunities: Map<string, PartnerOpportunityDetailDto>;
  customers: PartnerCustomerSearchHitDto[];
};

const stores = new Map<string, Store>();

function nowIso() {
  return new Date().toISOString();
}

/** Parse partner amount labels (₹ / commas) into Registry requestedAmount. */
function parseRequestedAmount(label?: string | null): number | null {
  if (!label) return null;
  const raw = label.trim();
  if (!raw || /^not\s*specified$/i.test(raw)) return null;
  const cleaned = raw.replace(/[₹,\s]/g, "").replace(/inr/gi, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

/**
 * Partner IDC `approxCibilScore` uses the Lead Information CIBIL master.
 * Persist onto Opportunity.lendingExtension — never a parallel WP-only field.
 */
function lendingExtensionWithApproxCibil(
  existing: unknown,
  borrowerFields?: Record<string, string> | null,
  productFields?: Record<string, string> | null,
): Prisma.InputJsonValue | undefined {
  const raw =
    borrowerFields?.approxCibilScore?.trim() ||
    productFields?.approxCibilScore?.trim() ||
    "";
  if (!raw || !isApproxCibilScoreBand(raw)) return undefined;
  const prev =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  prev.approxCibilScore = raw;
  return prev as Prisma.InputJsonValue;
}

function mapRegistryLifecycleToPartner(life: string, stage: string): {
  lifecycleStatus: string;
  stageLabel: string;
} {
  const l = (life || "").toLowerCase();
  const s = (stage || "").toLowerCase();
  if (l === "dialogue" || s === "lead_creation" || l === "draft") {
    return { lifecycleStatus: "draft", stageLabel: "Draft" };
  }
  if (l === "requirement_captured" || s === "requirement_captured") {
    return { lifecycleStatus: "active", stageLabel: "Requirement Captured" };
  }
  return {
    lifecycleStatus: life || "active",
    stageLabel: stage || "In Progress",
  };
}

function formatAmountLabel(amount: { toString(): string } | number | null | undefined): string {
  if (amount == null) return "Not Specified";
  const n = typeof amount === "number" ? amount : Number(amount.toString());
  if (!Number.isFinite(n)) return "Not Specified";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

/**
 * CO-WP-INT-001 / CO-WP-INT-003 — Resolve or create ECM Contact (progressive: name + mobile).
 * Idempotent on (organizationId, mobile): reuse existing Contact; never invent partner-local contacts.
 * Does not overwrite canonical Contact attributes on reuse.
 */
async function resolveOrCreatePartnerContact(input: {
  organizationId: string;
  actorUserId: string;
  displayName: string;
  mobile: string;
  city?: string | null;
  preferredContactId?: string | null;
}): Promise<{ id: string; name: string; mobile: string; city: string | null }> {
  const name = input.displayName.trim();
  if (!name) {
    throw new PartnerGatewayError("Customer name is required", "VALIDATION", 400);
  }
  const rawMobile = input.mobile.trim();
  if (!rawMobile || /^notspecified$/i.test(rawMobile.replace(/\s/g, ""))) {
    throw new PartnerGatewayError(
      "Customer mobile is required to create an Opportunity",
      "VALIDATION",
      400,
    );
  }

  const canonicalMobile = ecmCanonicalMobilePrimary(rawMobile);
  const digits = normalizeEcmMobile(rawMobile);
  if (!digits || digits.length < 10) {
    throw new PartnerGatewayError(
      "Enter a valid customer mobile number (at least 10 digits).",
      "VALIDATION",
      400,
    );
  }

  const toDto = (row: {
    id: string;
    name: string;
    mobilePrimary: string;
    city: string | null;
  }) => ({
    id: row.id,
    name: row.name,
    mobile: row.mobilePrimary,
    city: row.city,
  });

  if (input.preferredContactId && !input.preferredContactId.startsWith("cust-ph-")) {
    const existing = await prisma.ecmContact.findFirst({
      where: {
        id: input.preferredContactId,
        organizationId: input.organizationId,
        isDeleted: false,
      },
      select: { id: true, name: true, mobilePrimary: true, city: true },
    });
    if (existing) return toDto(existing);
  }

  async function findExistingIncludingDeleted() {
    const identity = await ecmContactRepository.findIdentityByMobile(
      input.organizationId,
      canonicalMobile,
    );
    if (!identity) return null;
    const row = await prisma.ecmContact.findUnique({
      where: { id: identity.id },
      select: {
        id: true,
        name: true,
        mobilePrimary: true,
        city: true,
        isDeleted: true,
      },
    });
    return row;
  }

  async function reuseOrRestore(
    row: {
      id: string;
      name: string;
      mobilePrimary: string;
      city: string | null;
      isDeleted: boolean;
    },
  ) {
    // Soft-deleted rows still hold the unique (org, mobile) key — restore minimally, do not overwrite profile.
    if (row.isDeleted) {
      const restored = await prisma.ecmContact.update({
        where: { id: row.id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
          modifiedBy: input.actorUserId,
        },
        select: { id: true, name: true, mobilePrimary: true, city: true },
      });
      return toDto(restored);
    }
    return toDto(row);
  }

  const found = await findExistingIncludingDeleted();
  if (found) return reuseOrRestore(found);

  try {
    const created = await prisma.ecmContact.create({
      data: {
        organizationId: input.organizationId,
        name,
        mobilePrimary: canonicalMobile,
        city: input.city?.trim() || null,
        primaryRole: "customer",
        roles: ["customer"],
        additionalRoles: [],
        status: "provisional",
        platformAccess: "no_access",
        createdBy: input.actorUserId,
        modifiedBy: input.actorUserId,
      },
      select: { id: true, name: true, mobilePrimary: true, city: true },
    });
    return toDto(created);
  } catch (err) {
    // Concurrent create race — unique (organization_id, mobile_primary) is the final guard.
    const isUnique =
      err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
    const msg = err instanceof Error ? err.message : String(err);
    if (
      isUnique ||
      msg.includes("Unique constraint") ||
      msg.toLowerCase().includes("mobile_primary")
    ) {
      const again = await findExistingIncludingDeleted();
      if (again) return reuseOrRestore(again);
      // Rare: unique hit on a presentation variant not in candidates — scan last-10.
      const last10 = digits.slice(-10);
      const fallback = await prisma.ecmContact.findFirst({
        where: {
          organizationId: input.organizationId,
          OR: ecmMobileLookupCandidates(last10).map((m) => ({ mobilePrimary: m })),
        },
        orderBy: [{ isDeleted: "asc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          name: true,
          mobilePrimary: true,
          city: true,
          isDeleted: true,
        },
      });
      if (fallback) return reuseOrRestore(fallback);
      throw new PartnerGatewayError(
        "An existing customer contact could not be resolved for this mobile. Please retry or select the customer from search.",
        "CONTACT_RESOLVE_FAILED",
        409,
      );
    }
    throw err;
  }
}

function skeletonDetailFromOwned(
  owned: OwnedOpportunityRow,
  partner: { id: string; displayName: string; organizationId: string },
): PartnerOpportunityDetailDto {
  const mapped = mapRegistryLifecycleToPartner(owned.lifecycleStatus, owned.requirementStage);
  const createdAt = owned.createdAt.toISOString();
  return {
    opportunityId: owned.id,
    reference: owned.opportunityNumber,
    customerId: owned.primaryContactId || "",
    customerDisplayName:
      owned.primaryContactName || owned.companyName || "Not Specified",
    productCode: owned.productCode,
    productLabel: owned.productLabel || "Not Specified",
    requiredAmountLabel: formatAmountLabel(owned.requestedAmount),
    stageLabel: mapped.stageLabel,
    lifecycleStatus: mapped.lifecycleStatus,
    ownerLabel: partner.displayName,
    updatedAt: owned.updatedAt.toISOString(),
    createdAt,
    summary: "Projected from Enterprise Opportunity Registry.",
    dtoSource: "enterprise_opportunity_registry",
    dtoNotice: DTO_NOTICE,
    documents: [],
    activities: [],
    timeline: [],
    loanFile: {
      available: false,
      fileId: null,
      fileReference: null,
      stageLabel: null,
      lenderLabel: null,
      amountLabel: null,
      statusLabel: "Not attached",
      message: "Deal / Loan File attaches after lender identification in Catalyst One.",
      dtoSource: "enterprise_opportunity_registry",
      dtoNotice: DTO_NOTICE,
    },
    sourceAttribution: {
      sourcePartnerId: partner.id,
      sourcePartnerName: partner.displayName,
      sourcePartnerCode: null,
      sourceType: "wealth_partner",
      organizationId: partner.organizationId,
      branchLabel: null,
      territoryLabel: null,
      hiddenFromPartnerUi: true,
    },
  };
}

function nextOpportunityReference(storeSize: number): string {
  const year = new Date().getFullYear();
  const seq = String(storeSize + 1).padStart(6, "0");
  return `RC-OPP-${year}-${seq}`;
}

function pushTimeline(
  detail: PartnerOpportunityDetailDto,
  title: string,
  body: string,
): void {
  const event: PartnerOpportunityTimelineEventDto = {
    eventId: `${detail.opportunityId}-tl-${detail.timeline.length + 1}-${Date.now()}`,
    title,
    occurredAt: nowIso(),
    body,
    dtoSource: DTO_SOURCE,
  };
  detail.timeline = [event, ...detail.timeline];
  detail.updatedAt = event.occurredAt;
}

function pushActivity(
  detail: PartnerOpportunityDetailDto,
  title: string,
  kindLabel: string,
  body: string,
): void {
  const activity: PartnerOpportunityActivityDto = {
    activityId: `${detail.opportunityId}-act-${detail.activities.length + 1}-${Date.now()}`,
    title,
    kindLabel,
    occurredAt: nowIso(),
    body,
    dtoSource: DTO_SOURCE,
  };
  detail.activities = [activity, ...detail.activities];
  detail.updatedAt = activity.occurredAt;
}

/** @deprecated Removed — LOD comes from EDIE via projectPartnerOpportunityLod. */
function applyHealth(detail: PartnerOpportunityDetailDto): PartnerOpportunityDetailDto {
  const lod = projectPartnerOpportunityLod(detail);
  detail.lod = lod;
  const missing = listPartnerLodMissingLabels(lod);
  if (!detail.requiredAmountLabel || detail.requiredAmountLabel === "Not Specified") {
    missing.push("Loan Amount");
  }
  const requiredCount = Math.max(lod.summary.required, 1);
  const uploadedCount = lod.summary.uploaded;
  const percent = Math.max(
    8,
    Math.min(
      100,
      35 +
        Math.round((uploadedCount / requiredCount) * 50) +
        (detail.requiredAmountLabel && detail.requiredAmountLabel !== "Not Specified" ? 15 : 0),
    ),
  );
  detail.completionPercent = percent;
  detail.missingItems = missing;
  detail.documentStatusSummary = {
    required: lod.summary.required,
    uploaded: lod.summary.uploaded,
    pending: lod.summary.pending,
    rejected: lod.summary.rejected,
    approved: lod.items.filter((i) => i.status === "uploaded").length,
  };
  return applyWorkspaceProjection(detail);
}

/**
 * CO-WP-JOURNEY-002 — Enrich Opportunity Workspace projection fields.
 * Placeholder until Opportunity Registry / ETE / Document Center cutover.
 */
function applyWorkspaceProjection(detail: PartnerOpportunityDetailDto): PartnerOpportunityDetailDto {
  const base = `/app/opportunities/${detail.opportunityId}`;
  const borrowerKind = detail.primaryBorrowerKind ?? null;
  detail.borrowerTypeLabel =
    borrowerKind === "company" ? "Company" : borrowerKind === "individual" ? "Individual" : "Not Specified";
  detail.subStageLabel =
    detail.lifecycleStatus === "draft"
      ? "Capture in progress"
      : detail.stageLabel === "Documents"
        ? "Document collection"
        : detail.stageLabel === "Credit Review"
          ? "Credit assessment"
          : detail.stageLabel === "Sent to Lender"
            ? "Lender login"
            : detail.stageLabel === "Sanction Received"
              ? "Sanction review"
              : detail.stageLabel === "Ready for Disbursement"
                ? "Disbursement prep"
                : detail.stageLabel === "Disbursed"
                  ? "Closed won"
                  : "Requirement review";
  const pct = detail.completionPercent ?? 0;
  detail.opportunityHealthLabel =
    pct >= 80 ? "Strong" : pct >= 50 ? "On track" : pct >= 25 ? "Needs attention" : "At risk";
  detail.assignedExecutive = {
    label: detail.ownerLabel || "Assigned Employee",
    roleLabel: "Relationship Manager",
  };

  const missing = detail.missingItems ?? [];
  if (missing.length > 0 && missing[0] !== "Loan Amount") {
    detail.nextBestAction = {
      title: `Upload ${missing[0]}`,
      reason: "Required documents from the Enterprise List of Documents are still pending.",
      ctaLabel: "Open Documents",
      ctaDeepLink: `${base}/documents`,
      dtoSource: DTO_SOURCE,
    };
  } else if (missing.includes("Loan Amount") || detail.requiredAmountLabel === "Not Specified") {
    detail.nextBestAction = {
      title: "Complete Loan Requirement",
      reason: "Required amount is not captured yet.",
      ctaLabel: "Open Overview",
      ctaDeepLink: base,
      dtoSource: DTO_SOURCE,
    };
  } else if (detail.lifecycleStatus === "draft") {
    detail.nextBestAction = {
      title: "Submit Opportunity",
      reason: "Draft is ready for Enterprise submission when requirements are complete.",
      ctaLabel: "Review & Submit",
      ctaDeepLink: `${base}/overview-submit`,
      dtoSource: DTO_SOURCE,
    };
  } else if (missing.length > 0) {
    detail.nextBestAction = {
      title: `Complete ${missing[0]}`,
      reason: "Enterprise readiness still has open items on this Opportunity.",
      ctaLabel: "Open Documents",
      ctaDeepLink: `${base}/documents`,
      dtoSource: DTO_SOURCE,
    };
  } else {
    detail.nextBestAction = {
      title: "Await Lender Response",
      reason: "Core capture looks complete. Monitor timeline for Enterprise updates.",
      ctaLabel: "Open Timeline",
      ctaDeepLink: `${base}/timeline`,
      dtoSource: DTO_SOURCE,
    };
  }

  // Fix draft NBA deep link — use overview; submit lives on Overview CTA
  if (detail.nextBestAction?.ctaDeepLink.endsWith("/overview-submit")) {
    detail.nextBestAction.ctaDeepLink = base;
    detail.nextBestAction.ctaLabel = "Open Overview";
  }

  detail.participants = detail.participants?.length
    ? detail.participants
    : [
        {
          participantId: `${detail.opportunityId}-p-borrower`,
          roleLabel: detail.borrowerTypeLabel === "Company" ? "Company" : "Borrower",
          displayName: detail.customerDisplayName,
          statusLabel: "Primary",
          dtoSource: DTO_SOURCE,
        },
      ];

  detail.lenders = detail.lenders?.length ? detail.lenders : [];

  const notesBody = (detail.notes ?? "").trim();
  detail.noteEntries = detail.noteEntries?.length
    ? detail.noteEntries
    : notesBody
      ? [
          {
            noteId: `${detail.opportunityId}-note-1`,
            body: notesBody,
            authorLabel: "Partner",
            occurredAt: detail.updatedAt,
            dtoSource: DTO_SOURCE,
          },
        ]
      : [];

  detail.historyEntries = detail.historyEntries?.length
    ? detail.historyEntries
    : (detail.timeline ?? []).map((ev, i) => ({
        historyId: `${detail.opportunityId}-hist-${i}`,
        title: ev.title,
        body: ev.body,
        actorLabel: "System",
        occurredAt: ev.occurredAt,
        dtoSource: DTO_SOURCE,
      }));

  const docs = detail.documents ?? [];
  const statusOf = (d: { statusLabel: string }) => d.statusLabel.toLowerCase();
  if (detail.lod) {
    detail.documentStatusSummary = {
      required: detail.lod.summary.required,
      uploaded: detail.lod.summary.uploaded,
      pending: detail.lod.summary.pending,
      rejected: detail.lod.summary.rejected,
      approved: detail.lod.items.filter((i) => i.status === "uploaded").length,
    };
  } else {
    detail.documentStatusSummary = {
      required: docs.length,
      uploaded: docs.length,
      pending: docs.filter((d) => statusOf(d).includes("pending")).length,
      rejected: docs.filter((d) => statusOf(d).includes("reject")).length,
      approved: docs.filter(
        (d) =>
          statusOf(d).includes("approv") ||
          statusOf(d).includes("received") ||
          statusOf(d).includes("upload"),
      ).length,
    };
  }

  detail.upcomingTasks = detail.upcomingTasks?.length
    ? detail.upcomingTasks
    : missing.slice(0, 3).map((m, i) => ({
        taskId: `${detail.opportunityId}-task-${i}`,
        title: m.startsWith("Complete") || m.startsWith("Upload") ? m : `Resolve: ${m}`,
        dueLabel: "Enterprise Task Engine (projection)",
        dtoSource: DTO_SOURCE,
      }));

  detail.communicationReservedMessage =
    detail.communicationReservedMessage ??
    "Enterprise Communication Hub — reserved. Messaging logic will arrive from Catalyst One.";

  // CO-WP-TIMELINE-001 — Partner business milestones (never expose internal stages in Connect UI).
  detail.businessTimeline = projectPartnerBusinessTimeline(detail);

  return detail;
}

function seedCustomers(): PartnerCustomerSearchHitDto[] {
  return [
    {
      customerId: "cust-ph-001",
      displayName: "Anita Sharma",
      mobile: "+91 98XXX XX201",
      city: "Pune",
      dtoSource: DTO_SOURCE,
    },
    {
      customerId: "cust-ph-002",
      displayName: "Rajesh Patel",
      mobile: "+91 98XXX XX452",
      city: "Ahmedabad",
      dtoSource: DTO_SOURCE,
    },
    {
      customerId: "cust-ph-003",
      displayName: "Meera Iyer",
      mobile: "+91 98XXX XX883",
      city: "Bengaluru",
      dtoSource: DTO_SOURCE,
    },
  ];
}

function seedOpportunity(partnerId: string, index: number): PartnerOpportunityDetailDto {
  const id = `opp-ph-${partnerId.slice(0, 8)}-${index}`;
  const customer = seedCustomers()[index % 3]!;
  const createdAt = nowIso();
  const stagePlan: Array<{
    productLabel: string;
    amount: string;
    stageLabel: string;
    lifecycleStatus: string;
  }> = [
    {
      productLabel: "Home Loan",
      amount: "₹75 Lakh",
      stageLabel: "Requirement Captured",
      lifecycleStatus: "active",
    },
    {
      productLabel: "Loan Against Property",
      amount: "₹1.2 Cr",
      stageLabel: "Draft",
      lifecycleStatus: "draft",
    },
    {
      productLabel: "Business Loan",
      amount: "₹50 Lakh",
      stageLabel: "Documents",
      lifecycleStatus: "active",
    },
    {
      productLabel: "Home Loan",
      amount: "₹90 Lakh",
      stageLabel: "Credit Review",
      lifecycleStatus: "active",
    },
    {
      productLabel: "Mutual Fund",
      amount: "₹10 Lakh",
      stageLabel: "Sent to Lender",
      lifecycleStatus: "active",
    },
    {
      productLabel: "Insurance",
      amount: "₹5 Lakh",
      stageLabel: "Sanction Received",
      lifecycleStatus: "active",
    },
  ];
  const plan = stagePlan[index % stagePlan.length]!;
  return {
    opportunityId: id,
    reference: nextOpportunityReference(1000 + index),
    customerId: customer.customerId,
    customerDisplayName: customer.displayName,
    productLabel: plan.productLabel,
    requiredAmountLabel: plan.amount,
    stageLabel: plan.stageLabel,
    lifecycleStatus: plan.lifecycleStatus,
    ownerLabel: "You",
    updatedAt: createdAt,
    createdAt,
    summary:
      "Placeholder opportunity for Wealth Partner Business Pipeline. Not written to Opportunity Registry.",
    dtoSource: DTO_SOURCE,
    dtoNotice: DTO_NOTICE,
    documents: [
      {
        documentId: `${id}-doc-1`,
        title: "PAN Card",
        statusLabel: "Received",
        categoryLabel: "KYC",
        updatedAt: createdAt,
        dtoSource: DTO_SOURCE,
      },
      {
        documentId: `${id}-doc-2`,
        title: "Salary Slips (3 months)",
        statusLabel: "Pending",
        categoryLabel: "Income",
        updatedAt: createdAt,
        dtoSource: DTO_SOURCE,
      },
    ],
    activities: [
      {
        activityId: `${id}-act-1`,
        title: "Opportunity Created",
        kindLabel: "System",
        occurredAt: createdAt,
        body: `${customer.displayName} · ${plan.productLabel}`,
        dtoSource: DTO_SOURCE,
      },
      {
        activityId: `${id}-act-2`,
        title: "Customer Updated",
        kindLabel: "Follow-up",
        occurredAt: createdAt,
        body: "Customer profile linked to this Opportunity.",
        dtoSource: DTO_SOURCE,
      },
      ...(index === 0 || plan.stageLabel === "Documents" || plan.stageLabel === "Credit Review"
        ? [
            {
              activityId: `${id}-act-3`,
              title: "Recommendation Generated",
              kindLabel: "Recommendation",
              occurredAt: createdAt,
              body: "Lender recommendation pack ready for partner review.",
              dtoSource: DTO_SOURCE,
            },
          ]
        : []),
      ...(plan.stageLabel === "Sent to Lender" || index === 0
        ? [
            {
              activityId: `${id}-act-4`,
              title: "Lender Update",
              kindLabel: "Lender",
              occurredAt: createdAt,
              body:
                index === 0
                  ? "Case acknowledged — awaiting lender response."
                  : `Stage moved to ${plan.stageLabel}.`,
              dtoSource: DTO_SOURCE,
            },
          ]
        : []),
    ],
    timeline: [
      {
        eventId: `${id}-tl-2`,
        title: "Pipeline stage updated",
        occurredAt: createdAt,
        body: `Stage: ${plan.stageLabel}.`,
        dtoSource: DTO_SOURCE,
      },
      {
        eventId: `${id}-tl-1`,
        title: "Opportunity opened",
        occurredAt: createdAt,
        body: "New Opportunity journey started.",
        dtoSource: DTO_SOURCE,
      },
    ],
    loanFile: {
      available: index === 0,
      fileId: index === 0 ? `lf-ph-${index}` : null,
      fileReference: index === 0 ? `LF-WP-${2000 + index}` : null,
      stageLabel: index === 0 ? "Pre-login" : null,
      lenderLabel: index === 0 ? "Not Specified" : null,
      amountLabel: index === 0 ? plan.amount : null,
      statusLabel: index === 0 ? "Draft workspace view" : "Not attached",
      message:
        index === 0
          ? "Placeholder Loan File view. Deal/LoanFile SSOT remains in Catalyst One."
          : "No Loan File attached yet. This is a placeholder projection.",
      dtoSource: DTO_SOURCE,
      dtoNotice: DTO_NOTICE,
    },
  };
}

type PersistedPlaceholderSlice = {
  opportunities?: PartnerOpportunityDetailDto[];
  customers?: PartnerCustomerSearchHitDto[];
};

function seedOpportunityId(partnerId: string, index: number): string {
  return `opp-ph-${partnerId.slice(0, 8)}-${index}`;
}

function tryReconstructSeedOpportunity(
  partnerId: string,
  opportunityId: string,
): PartnerOpportunityDetailDto | null {
  const decoded = decodeURIComponent(opportunityId).trim();
  const prefix = `opp-ph-${partnerId.slice(0, 8)}-`;
  if (decoded.startsWith(prefix)) {
    const index = Number(decoded.slice(prefix.length));
    if (Number.isInteger(index) && index >= 0 && index < 6) {
      return seedOpportunity(partnerId, index);
    }
  }
  if (decoded.startsWith("opp-seed-")) {
    const index = Number(decoded.slice("opp-seed-".length));
    if (Number.isInteger(index) && index >= 0 && index < 6) {
      const row = seedOpportunity(partnerId, index);
      row.opportunityId = `opp-seed-${index}`;
      return row;
    }
  }
  return null;
}

function mergeDeterministicSeeds(_partnerId: string, _store: Store): void {
  // CO-ORG-004 — do not invent partner opportunities / customers as production truth.
  // Partner Business must project Opportunity Registry / EAR — seeds retired.
}

async function readPersistedPlaceholder(partnerId: string): Promise<PersistedPlaceholderSlice | null> {
  if (!isDatabaseAvailable()) return null;
  try {
    const row = await prisma.enterpriseWealthPartner.findUnique({
      where: { id: partnerId },
      select: { profileJson: true },
    });
    if (!row?.profileJson || typeof row.profileJson !== "object" || Array.isArray(row.profileJson)) {
      return null;
    }
    const slice = (row.profileJson as Record<string, unknown>)[PLACEHOLDER_PROFILE_KEY];
    if (!slice || typeof slice !== "object" || Array.isArray(slice)) return null;
    return slice as PersistedPlaceholderSlice;
  } catch {
    return null;
  }
}

async function writePersistedPlaceholder(partnerId: string, store: Store): Promise<void> {
  if (!isDatabaseAvailable()) return;
  try {
    const row = await prisma.enterpriseWealthPartner.findUnique({
      where: { id: partnerId },
      select: { profileJson: true },
    });
    const prev =
      row?.profileJson && typeof row.profileJson === "object" && !Array.isArray(row.profileJson)
        ? { ...(row.profileJson as Record<string, unknown>) }
        : {};
    prev[PLACEHOLDER_PROFILE_KEY] = {
      opportunities: [...store.opportunities.values()],
      customers: store.customers,
    };
    await prisma.enterpriseWealthPartner.update({
      where: { id: partnerId },
      data: { profileJson: prev as Prisma.InputJsonValue },
    });
  } catch {
    // Placeholder durability is best-effort until Opportunity Registry cutover.
  }
}

/**
 * CO-WP-BAT-004 — Hydrate placeholder store from Prisma profileJson + deterministic seeds.
 * Fixes Vercel serverless in-memory Map loss between list → detail requests.
 */
async function ensureStore(partnerId: string): Promise<Store> {
  let store = stores.get(partnerId);
  if (!store) {
    store = { opportunities: new Map(), customers: seedCustomers() };
    const persisted = await readPersistedPlaceholder(partnerId);
    if (persisted?.customers?.length) {
      store.customers = persisted.customers;
    } else {
      // CO-ORG-004 — no seed customer invent when empty
      store.customers = [];
    }
    for (const opp of persisted?.opportunities ?? []) {
      if (opp?.opportunityId) store.opportunities.set(opp.opportunityId, opp);
    }
    stores.set(partnerId, store);
  }
  mergeDeterministicSeeds(partnerId, store);
  return store;
}

async function persistStore(partnerId: string, store: Store): Promise<void> {
  stores.set(partnerId, store);
  await writePersistedPlaceholder(partnerId, store);
}

function toSummary(detail: PartnerOpportunityDetailDto): PartnerOpportunitySummaryDto {
  return {
    opportunityId: detail.opportunityId,
    reference: detail.reference,
    customerDisplayName: detail.customerDisplayName,
    productLabel: detail.productLabel,
    requiredAmountLabel: detail.requiredAmountLabel,
    stageLabel: detail.businessTimeline?.currentLabel || detail.stageLabel,
    lifecycleStatus: detail.lifecycleStatus,
    updatedAt: detail.updatedAt,
    dtoSource: detail.dtoSource,
  };
}

/** CO-WP-BUSINESS-001 — map Opportunity stage → Enterprise pipeline bucket. */
function resolvePipelineBucket(
  detail: PartnerOpportunityDetailDto,
): PartnerBusinessPipelineBucketId {
  const stage = (detail.stageLabel || "").toLowerCase();
  const life = (detail.lifecycleStatus || "").toLowerCase();
  const health = (detail.opportunityHealthLabel || "").toLowerCase();

  if (stage.includes("disbursed")) return "disbursed";
  if (stage.includes("ready for disbursement") || stage.includes("disbursement")) {
    return "ready_for_disbursement";
  }
  if (stage.includes("sanction")) return "sanction_received";
  if (stage.includes("lender") || stage.includes("login")) return "sent_to_lender";
  if (stage.includes("credit")) return "credit_review";
  if (stage.includes("document")) return "documents_pending";
  if (health.includes("risk") || health.includes("attention") || health.includes("overdue")) {
    return "follow_up_required";
  }
  if (life === "draft" || stage.includes("draft") || stage.includes("requirement")) {
    return "new_opportunities";
  }
  return "new_opportunities";
}

function productFilterKeys(productLabel: string): string[] {
  const p = productLabel.toLowerCase();
  const keys: string[] = [];
  if (p.includes("home")) keys.push("home_loan");
  if (p.includes("business")) keys.push("business_loan");
  if (p.includes("against property") || p === "lap" || p.includes("lap")) keys.push("lap");
  if (p.includes("mutual")) keys.push("mutual_fund");
  if (p.includes("insurance")) keys.push("insurance");
  return keys;
}

function formatPipelineValue(labels: string[]): string {
  if (labels.length === 0) return "₹0";
  if (labels.length === 1) return labels[0]!;
  return `${labels.length} files`;
}

function pipelineGreeting(now = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hour12: false,
    }).format(now),
  );
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good evening";
}

function toPipelineRow(
  detail: PartnerOpportunityDetailDto,
  customers: PartnerCustomerSearchHitDto[],
): PartnerBusinessPipelineOpportunityRowDto {
  const customer = customers.find((c) => c.customerId === detail.customerId);
  const bucket = resolvePipelineBucket(detail);
  const nba = detail.nextBestAction;
  const health = detail.opportunityHealthLabel || "Not Specified";
  const isOverdue =
    health.toLowerCase().includes("risk") ||
    (detail.missingItems?.length ?? 0) >= 3;
  const priorityRank =
    bucket === "follow_up_required"
      ? 90
      : bucket === "documents_pending"
        ? 70
        : bucket === "new_opportunities"
          ? 60
          : 40;

  return {
    opportunityId: detail.opportunityId,
    reference: detail.reference,
    customerDisplayName: detail.customerDisplayName,
    productLabel: detail.productLabel,
    requiredAmountLabel: detail.requiredAmountLabel,
    stageLabel: detail.businessTimeline?.currentLabel || detail.stageLabel,
    subStageLabel: detail.businessTimeline?.currentDescription || "In progress",
    healthLabel: health,
    nextBestActionLabel: nba?.title || "Open Opportunity",
    nextBestActionDeepLink: nba?.ctaDeepLink || `/app/opportunities/${detail.opportunityId}`,
    workspaceDeepLink: `/app/opportunities/${detail.opportunityId}`,
    lifecycleStatus: detail.lifecycleStatus,
    pipelineBucketId: bucket,
    productFilterKeys: productFilterKeys(detail.productLabel),
    mobile: customer?.mobile ?? null,
    companyName:
      detail.primaryBorrowerKind === "company" ? detail.customerDisplayName : null,
    priorityRank,
    isOverdue,
    updatedAt: detail.updatedAt,
    dtoSource: detail.dtoSource,
  };
}

function buildBusinessPipelineDto(
  partnerId: string,
  details: PartnerOpportunityDetailDto[],
  customers: PartnerCustomerSearchHitDto[],
): PartnerBusinessPipelineDto {
  const now = new Date();
  const rows = details
    .map((d) => toPipelineRow(d, customers))
    .sort(
      (a, b) =>
        b.priorityRank - a.priorityRank || b.updatedAt.localeCompare(a.updatedAt),
    );

  const pipelineCards = PARTNER_BUSINESS_PIPELINE_BUCKETS.map((bucket, index) => {
    const inBucket = rows.filter((r) => r.pipelineBucketId === bucket.id);
    const amounts = inBucket.map((r) => r.requiredAmountLabel);
    const trendDirection: "up" | "down" | "flat" =
      inBucket.length > 2 ? "up" : inBucket.length === 1 ? "flat" : "down";
    return {
      id: bucket.id,
      label: bucket.label,
      tone: bucket.tone,
      emoji: bucket.emoji,
      count: inBucket.length,
      valueLabel: formatPipelineValue(amounts),
      trendDirection,
      trendLabel:
        trendDirection === "up"
          ? "+active"
          : trendDirection === "down"
            ? "quiet"
            : "steady",
      filterKey: bucket.id,
      sortOrder: bucket.sortOrder ?? index * 10,
    };
  });

  const todaysPriorities = [] as PartnerBusinessPipelineDto["todaysPriorities"];
  let rank = 0;
  for (const detail of details) {
    const base = `/app/opportunities/${detail.opportunityId}`;
    const name = detail.customerDisplayName;
    if (detail.activities?.some((a) => a.kindLabel.toLowerCase().includes("follow"))) {
      todaysPriorities.push({
        id: `${detail.opportunityId}-call`,
        kind: "calls",
        kindLabel: PARTNER_BUSINESS_PIPELINE_PRIORITY_KINDS[0]!.label,
        title: `Call ${name}`,
        subtitle: detail.productLabel,
        opportunityId: detail.opportunityId,
        deepLink: base,
        dueLabel: "Today",
        priorityRank: ++rank,
      });
    }
    if ((detail.missingItems?.length ?? 0) > 0) {
      todaysPriorities.push({
        id: `${detail.opportunityId}-docs`,
        kind: "documents",
        kindLabel: PARTNER_BUSINESS_PIPELINE_PRIORITY_KINDS[3]!.label,
        title: `Pending documents — ${name}`,
        subtitle: detail.missingItems!.slice(0, 2).join(", "),
        opportunityId: detail.opportunityId,
        deepLink: `${base}/documents`,
        dueLabel: "Pending",
        priorityRank: ++rank,
      });
    }
    if ((detail.opportunityHealthLabel || "").toLowerCase().includes("risk")) {
      todaysPriorities.push({
        id: `${detail.opportunityId}-overdue`,
        kind: "overdue_tasks",
        kindLabel: PARTNER_BUSINESS_PIPELINE_PRIORITY_KINDS[4]!.label,
        title: `Overdue attention — ${name}`,
        subtitle: detail.nextBestAction?.title || "Open Opportunity",
        opportunityId: detail.opportunityId,
        deepLink: detail.nextBestAction?.ctaDeepLink || base,
        dueLabel: "Overdue",
        priorityRank: ++rank,
      });
    }
    if (detail.upcomingTasks?.length) {
      todaysPriorities.push({
        id: `${detail.opportunityId}-follow`,
        kind: "follow_ups",
        kindLabel: PARTNER_BUSINESS_PIPELINE_PRIORITY_KINDS[2]!.label,
        title: detail.upcomingTasks[0]!.title,
        subtitle: name,
        opportunityId: detail.opportunityId,
        deepLink: base,
        dueLabel: detail.upcomingTasks[0]!.dueLabel,
        priorityRank: ++rank,
      });
    }
  }

  // Ensure each priority kind appears at least as an empty-capable projection sample
  if (!todaysPriorities.some((p) => p.kind === "meetings") && details[0]) {
    todaysPriorities.push({
      id: `${details[0].opportunityId}-meeting`,
      kind: "meetings",
      kindLabel: PARTNER_BUSINESS_PIPELINE_PRIORITY_KINDS[1]!.label,
      title: `Schedule meeting — ${details[0].customerDisplayName}`,
      subtitle: details[0].productLabel,
      opportunityId: details[0].opportunityId,
      deepLink: `/app/opportunities/${details[0].opportunityId}`,
      dueLabel: "Today",
      priorityRank: ++rank,
    });
  }

  todaysPriorities.sort((a, b) => a.priorityRank - b.priorityRank);

  const recommendations = details
    .map((d, i) => {
      const nba = d.nextBestAction;
      if (!nba) return null;
      return {
        id: `${d.opportunityId}-nba`,
        title: nba.title.includes(d.customerDisplayName)
          ? nba.title
          : `${nba.title} — ${d.customerDisplayName}`,
        reason: nba.reason,
        ctaLabel: nba.ctaLabel,
        deepLink: nba.ctaDeepLink,
        opportunityId: d.opportunityId,
        sortOrder: i * 10,
        dtoSource: DTO_SOURCE,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .slice(0, 6);

  const draft = details
    .filter((d) => d.lifecycleStatus === "draft")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  return {
    partnerId,
    generatedAt: now.toISOString(),
    header: {
      title: PARTNER_BUSINESS_PIPELINE_META.title,
      subtitle: PARTNER_BUSINESS_PIPELINE_META.subtitle,
      greeting: pipelineGreeting(now),
      todaysDateLabel: dateLabel,
      todaysPriorityCount: todaysPriorities.length,
    },
    search: {
      placeholder: PARTNER_BUSINESS_PIPELINE_META.searchPlaceholder,
      scopes: ["customer", "opportunity_number", "mobile", "product", "company"],
    },
    filters: PARTNER_BUSINESS_PIPELINE_FILTERS.map((f) => ({ ...f })),
    quickActions: PARTNER_BUSINESS_PIPELINE_QUICK_ACTIONS.map((a) => ({ ...a })),
    pipelineCards,
    todaysPriorities: todaysPriorities.slice(0, 12),
    opportunities: rows,
    recommendations,
    emptyStates: {
      opportunities: { ...PARTNER_BUSINESS_PIPELINE_EMPTY_STATES.opportunities },
      followUps: { ...PARTNER_BUSINESS_PIPELINE_EMPTY_STATES.follow_ups },
      documents: { ...PARTNER_BUSINESS_PIPELINE_EMPTY_STATES.documents },
      tasks: { ...PARTNER_BUSINESS_PIPELINE_EMPTY_STATES.tasks },
      priorities: { ...PARTNER_BUSINESS_PIPELINE_EMPTY_STATES.priorities },
      recommendations: { ...PARTNER_BUSINESS_PIPELINE_EMPTY_STATES.recommendations },
      search: { ...PARTNER_BUSINESS_PIPELINE_EMPTY_STATES.search },
    },
    resumeDraft: draft
      ? {
          opportunityId: draft.opportunityId,
          customerDisplayName: draft.customerDisplayName,
          productLabel: draft.productLabel,
          updatedAt: draft.updatedAt,
          completionPercent: draft.completionPercent ?? 0,
          continueDeepLink: `/app/opportunities/${draft.opportunityId}`,
        }
      : null,
    dtoSource: DTO_SOURCE,
    dtoNotice: PARTNER_BUSINESS_PIPELINE_META.dtoNotice,
  };
}

async function resolvePartner(userId: string) {
  const binding = await resolvePartnerBindingForUser(userId);
  return binding.partner.id;
}

async function resolvePartnerContext(userId: string) {
  const binding = await resolvePartnerBindingForUser(userId);
  return {
    partnerId: binding.partner.id,
    organizationId: binding.partner.organizationId,
    partnerDisplayName: binding.partner.displayName,
    userDisplayName: `${binding.user.firstName} ${binding.user.lastName}`.trim() || binding.user.email,
    userId: binding.user.id,
  };
}

async function assertPartnerAction(
  userId: string,
  action: PartnerEntitlementAction,
  entity?: { entityKind: "opportunity" | "deal"; entityId: string },
): Promise<{ partnerId: string; organizationId: string; entitlements: PartnerEffectiveEntitlements }> {
  const ctx = await resolvePartnerContext(userId);
  const entitlements = await partnerEntitlementsService.assertEntitlement({
    wealthPartnerId: ctx.partnerId,
    organizationId: ctx.organizationId,
    action,
    entityKind: entity?.entityKind ?? null,
    entityId: entity?.entityId ?? null,
  });
  return { partnerId: ctx.partnerId, organizationId: ctx.organizationId, entitlements };
}

/**
 * CO-WP-ACCESS-001A — Production auth: Registry ownership then entitlement.
 * Placeholder store may enrich projection but cannot authorize.
 */
async function assertOwnedOpportunityAction(
  userId: string,
  action: PartnerEntitlementAction,
  opportunityRef: string,
) {
  const ctx = await resolvePartnerContext(userId);
  const owned = await partnerOwnershipService.requireOwnedOpportunity({
    organizationId: ctx.organizationId,
    wealthPartnerId: ctx.partnerId,
    opportunityRef,
  });
  const entitlements = await partnerEntitlementsService.assertEntitlement({
    wealthPartnerId: ctx.partnerId,
    organizationId: ctx.organizationId,
    action,
    entityKind: "opportunity",
    entityId: owned.id,
  });
  return { ...ctx, owned, entitlements };
}

function projectOwnedSummary(
  row: Awaited<ReturnType<typeof partnerOwnershipService.listOwnedOpportunities>>[number],
): PartnerOpportunitySummaryDto {
  return {
    opportunityId: row.id,
    reference: row.opportunityNumber,
    customerDisplayName:
      row.primaryContactName || row.companyName || "Not Specified",
    productLabel: row.productLabel || "Not Specified",
    requiredAmountLabel: row.requestedAmount
      ? String(row.requestedAmount)
      : "Not Specified",
    stageLabel: row.requirementStage,
    lifecycleStatus: row.lifecycleStatus,
    updatedAt: row.updatedAt.toISOString(),
    dtoSource: "enterprise_opportunity_registry",
  };
}

function requireDetail(userId: string, opportunityId: string): Promise<{
  partnerId: string;
  store: Store;
  detail: PartnerOpportunityDetailDto;
  owned: OwnedOpportunityRow;
}> {
  return (async () => {
    const ctx = await resolvePartnerContext(userId);
    const owned = await partnerOwnershipService.requireOwnedOpportunity({
      organizationId: ctx.organizationId,
      wealthPartnerId: ctx.partnerId,
      opportunityRef: opportunityId,
    });
    const store = await ensureStore(ctx.partnerId);
    const id = owned.id;
    let detail = store.opportunities.get(id);
    if (!detail) {
      detail = skeletonDetailFromOwned(owned, {
        id: ctx.partnerId,
        displayName: ctx.partnerDisplayName,
        organizationId: ctx.organizationId,
      });
      store.opportunities.set(id, detail);
      // Memory warm only — Registry remains SSOT (CO-PERF: avoid durable write on read).
      stores.set(ctx.partnerId, store);
    } else {
      const mapped = mapRegistryLifecycleToPartner(
        owned.lifecycleStatus,
        owned.requirementStage,
      );
      detail = {
        ...detail,
        opportunityId: owned.id,
        reference: owned.opportunityNumber,
        productCode: owned.productCode ?? detail.productCode,
        productLabel: owned.productLabel || detail.productLabel,
        requiredAmountLabel:
          owned.requestedAmount != null
            ? formatAmountLabel(owned.requestedAmount)
            : detail.requiredAmountLabel,
        customerDisplayName:
          owned.primaryContactName ||
          owned.companyName ||
          detail.customerDisplayName,
        stageLabel: mapped.stageLabel,
        lifecycleStatus: mapped.lifecycleStatus,
        updatedAt: owned.updatedAt.toISOString(),
        dtoSource: "enterprise_opportunity_registry",
      };
      store.opportunities.set(id, detail);
      stores.set(ctx.partnerId, store);
    }
    if (!detail.timeline) detail.timeline = [];
    return { partnerId: ctx.partnerId, store, detail, owned };
  })();
}

export const partnerBusinessService = {
  async getHub(userId: string): Promise<PartnerBusinessHubDto> {
    await assertPartnerAction(userId, "view");
    const ctx = await resolvePartnerContext(userId);
    const owned = await partnerOwnershipService.listOwnedOpportunities({
      organizationId: ctx.organizationId,
      wealthPartnerId: ctx.partnerId,
    });
    const items = owned.map(projectOwnedSummary);
    const draft = owned
      .filter((d) => ["dialogue", "draft"].includes((d.lifecycleStatus || "").toLowerCase()))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    return {
      partnerId: ctx.partnerId,
      title: "Business",
      subtitle: "Your opportunities",
      opportunityCount: items.length,
      opportunities: items,
      resumeDraft: draft
        ? {
            opportunityId: draft.id,
            customerDisplayName:
              draft.primaryContactName || draft.companyName || "Not Specified",
            productLabel: draft.productLabel || "Not Specified",
            updatedAt: draft.updatedAt.toISOString(),
            completionPercent: 0,
            continueDeepLink: `/app/opportunities/${draft.id}`,
          }
        : null,
      emptyState: {
        title: "No opportunities yet",
        message: "Start a New Opportunity journey for a customer.",
        ctaLabel: "New Opportunity",
        ctaDeepLink: "/app/opportunities/new",
      },
      dtoSource: "enterprise_opportunity_registry",
      dtoNotice: DTO_NOTICE,
    };
  },

  /** CO-WP-INT-001 — My Business Pipeline from owned Opportunity Registry rows. */
  async getBusinessPipeline(userId: string): Promise<PartnerBusinessPipelineDto> {
    await assertPartnerAction(userId, "view");
    const ctx = await resolvePartnerContext(userId);

    return memoPartnerPipeline(ctx.partnerId, async () => {
      const cached = readPartnerPipelineCache(ctx.partnerId);
      if (cached) return cached;

      const owned = await partnerOwnershipService.listOwnedOpportunities({
        organizationId: ctx.organizationId,
        wealthPartnerId: ctx.partnerId,
      });
      const store = await ensureStore(ctx.partnerId);
      const details: PartnerOpportunityDetailDto[] = [];
      for (const row of owned) {
        let detail = store.opportunities.get(row.id);
        if (!detail) {
          detail = skeletonDetailFromOwned(row, {
            id: ctx.partnerId,
            displayName: ctx.partnerDisplayName,
            organizationId: ctx.organizationId,
          });
          store.opportunities.set(row.id, detail);
        } else {
          const mapped = mapRegistryLifecycleToPartner(
            row.lifecycleStatus,
            row.requirementStage,
          );
          detail = {
            ...detail,
            opportunityId: row.id,
            reference: row.opportunityNumber,
            productLabel: row.productLabel || detail.productLabel,
            productCode: row.productCode ?? detail.productCode,
            requiredAmountLabel:
              row.requestedAmount != null
                ? formatAmountLabel(row.requestedAmount)
                : detail.requiredAmountLabel,
            customerDisplayName:
              row.primaryContactName || row.companyName || detail.customerDisplayName,
            stageLabel: mapped.stageLabel,
            lifecycleStatus: mapped.lifecycleStatus,
            updatedAt: row.updatedAt.toISOString(),
            dtoSource: "enterprise_opportunity_registry",
          };
          store.opportunities.set(row.id, detail);
        }
        details.push(applyHealth(detail));
      }
      stores.set(ctx.partnerId, store);
      const dto = buildBusinessPipelineDto(ctx.partnerId, details, store.customers);
      writePartnerPipelineCache(ctx.partnerId, dto);
      return dto;
    });
  },

  /**
   * CO-WP-PERF-002 — Home desk: reuse pipeline store details (no docs/notes re-hydrate).
   */
  async listCachedOpportunityDetailsForHome(
    userId: string,
    opportunityIds: string[],
  ): Promise<PartnerOpportunityDetailDto[]> {
    const ctx = await resolvePartnerContext(userId);
    const store = await ensureStore(ctx.partnerId);
    const out: PartnerOpportunityDetailDto[] = [];
    for (const id of opportunityIds) {
      const detail = store.opportunities.get(id);
      if (detail) out.push(detail);
    }
    return out;
  },

  async listOpportunities(userId: string): Promise<PartnerOpportunitySummaryDto[]> {
    const ctx = await resolvePartnerContext(userId);
    await assertPartnerAction(userId, "view");
    const owned = await partnerOwnershipService.listOwnedOpportunities({
      organizationId: ctx.organizationId,
      wealthPartnerId: ctx.partnerId,
    });
    return owned.map(projectOwnedSummary);
  },

  async getOpportunity(userId: string, opportunityId: string): Promise<PartnerOpportunityDetailDto> {
    const { owned, entitlements, partnerId, organizationId, partnerDisplayName } =
      await assertOwnedOpportunityAction(userId, "view", opportunityId);

    // Enrichment from partner projection store when present — ownership already proven via Registry.
    const store = await ensureStore(partnerId);
    let detail = store.opportunities.get(owned.id);
    if (!detail) {
      detail = skeletonDetailFromOwned(owned, {
        id: partnerId,
        displayName: partnerDisplayName,
        organizationId,
      });
      store.opportunities.set(owned.id, detail);
      stores.set(partnerId, store);
    } else {
      const mapped = mapRegistryLifecycleToPartner(
        owned.lifecycleStatus,
        owned.requirementStage,
      );
      detail = {
        ...detail,
        opportunityId: owned.id,
        reference: owned.opportunityNumber,
        customerId: owned.primaryContactId || detail.customerId || "",
        customerDisplayName:
          owned.primaryContactName || owned.companyName || detail.customerDisplayName,
        productCode: owned.productCode ?? detail.productCode,
        productLabel: owned.productLabel || detail.productLabel,
        requiredAmountLabel:
          owned.requestedAmount != null
            ? formatAmountLabel(owned.requestedAmount)
            : detail.requiredAmountLabel,
        stageLabel: mapped.stageLabel,
        lifecycleStatus: mapped.lifecycleStatus,
        updatedAt: owned.updatedAt.toISOString(),
        dtoSource: "enterprise_opportunity_registry",
      };
      store.opportunities.set(owned.id, detail);
    }

    // CO-WP-INT-002 — hydrate Documents + Activity from enterprise SSOTs (not placeholder).
    const [documents, notes] = await Promise.all([
      listPartnerOpportunityDocuments({
        organizationId: owned.organizationId,
        opportunityId: owned.id,
      }),
      listPartnerVisibleOpportunityNotes({
        opportunityId: owned.id,
        contactId: owned.primaryContactId,
      }),
    ]);
    detail.documents = documents;
    detail.activities = notes.activities;
    detail.noteEntries = notes.noteEntries;
    detail.lod = projectPartnerOpportunityLod(detail);

    const hydrated = applyHealth(detail);
    hydrated.lenders = await listProjectedLendersForOpportunity(
      owned.organizationId,
      owned.id,
    );
    if (!hydrated.lenders.length) {
      const recHref = `/app/opportunities/${owned.id}/recommendations`;
      hydrated.nextBestAction = {
        title: "Choose lenders",
        reason:
          "Review Saarthi recommendations or add a lender from the Enterprise Lender Registry.",
        ctaLabel: "Open Lender Recommendation",
        ctaDeepLink: recHref,
        dtoSource: DTO_SOURCE,
      };
    }
    store.opportunities.set(owned.id, hydrated);
    stores.set(partnerId, store);
    return {
      ...hydrated,
      opportunityId: owned.id,
      reference: owned.opportunityNumber,
      entitlements: {
        executionMode: entitlements.executionMode,
        source: entitlements.source,
        permissions: entitlements.permissions,
        modules: entitlements.modules,
      },
    };
  },

  /** CO-WP-INT-002 — Customer search from owned Opportunity primary contacts (ECM). */
  async searchCustomers(
    userId: string,
    query: string,
  ): Promise<PartnerCustomerSearchHitDto[]> {
    await assertPartnerAction(userId, "view");
    const ctx = await resolvePartnerContext(userId);
    const owned = await partnerOwnershipService.listOwnedCustomerIds({
      organizationId: ctx.organizationId,
      wealthPartnerId: ctx.partnerId,
    });
    const q = query.trim().toLowerCase();
    const qDigits = query.replace(/\D/g, "");
    const hits: PartnerCustomerSearchHitDto[] = [];
    for (const row of owned) {
      const ecm = await loadEcmContactForPartner(row.customerId);
      const displayName = ecm?.name || row.displayName || "Not Specified";
      const mobile = ecm?.mobilePrimary || row.mobile || "";
      const city = ecm?.city || row.city || null;
      if (q) {
        const mobileDigits = mobile.replace(/\D/g, "");
        const match =
          displayName.toLowerCase().includes(q) ||
          mobile.toLowerCase().includes(q) ||
          (qDigits.length >= 3 && mobileDigits.includes(qDigits)) ||
          (city ?? "").toLowerCase().includes(q);
        if (!match) continue;
      }
      hits.push({
        customerId: row.customerId,
        displayName,
        mobile,
        city,
        dtoSource: "enterprise_customer_registry",
      });
    }
    return hits;
  },

  /**
   * CO-WP-SEARCH-001 — Unified Global Search for Catalyst Connect.
   * Matches Customer Name · Mobile · Opportunity Number · Loan Number · Product · Property City.
   * Groups: Customers · Opportunities · Documents.
   */
  async searchEnterprise(userId: string, query: string): Promise<import("@/types/enterprise-partner-search").PartnerUnifiedSearchDto> {
    const partnerId = await resolvePartner(userId);
    const store = await ensureStore(partnerId);
    const raw = query.trim();
    const q = raw.toLowerCase();
    const qDigits = raw.replace(/\D/g, "");

    const customerHits: import("@/types/enterprise-partner-search").PartnerSearchHitDto[] = [];
    const opportunityHits: import("@/types/enterprise-partner-search").PartnerSearchHitDto[] = [];
    const documentHits: import("@/types/enterprise-partner-search").PartnerSearchHitDto[] = [];

    if (q.length >= 1) {
      for (const c of store.customers) {
        const mobileDigits = c.mobile.replace(/\D/g, "");
        let matchedOn: string | null = null;
        if (c.displayName.toLowerCase().includes(q)) matchedOn = "Customer Name";
        else if (qDigits.length >= 3 && mobileDigits.includes(qDigits)) matchedOn = "Mobile Number";
        else if (c.mobile.toLowerCase().includes(q)) matchedOn = "Mobile Number";
        else if ((c.city ?? "").toLowerCase().includes(q)) matchedOn = "Property City";
        if (!matchedOn) continue;
        customerHits.push({
          id: `cust-${c.customerId}`,
          group: "customers",
          title: c.displayName,
          subtitle: [c.mobile, c.city].filter(Boolean).join(" · ") || "Customer",
          matchedOn,
          deepLink: `/app/customers/${encodeURIComponent(c.customerId)}`,
        });
      }

      for (const detail of store.opportunities.values()) {
        const propertyCity =
          detail.productFields?.propertyCity ||
          detail.productFields?.property_city ||
          detail.productFields?.city ||
          detail.borrowerFields?.city ||
          "";
        const loanRef = detail.loanFile?.fileReference || "";
        const customer = store.customers.find((c) => c.customerId === detail.customerId);
        const customerMobile = customer?.mobile || "";

        let matchedOn: string | null = null;
        if (detail.reference.toLowerCase().includes(q)) matchedOn = "Opportunity Number";
        else if (loanRef && loanRef.toLowerCase().includes(q)) matchedOn = "Loan Number";
        else if ((detail.productLabel || "").toLowerCase().includes(q)) matchedOn = "Product";
        else if ((detail.productCode || "").toLowerCase().includes(q)) matchedOn = "Product";
        else if (propertyCity.toLowerCase().includes(q)) matchedOn = "Property City";
        else if (detail.customerDisplayName.toLowerCase().includes(q)) matchedOn = "Customer Name";
        else if (
          qDigits.length >= 3 &&
          customerMobile.replace(/\D/g, "").includes(qDigits)
        ) {
          matchedOn = "Mobile Number";
        }

        if (matchedOn) {
          opportunityHits.push({
            id: `opp-${detail.opportunityId}`,
            group: "opportunities",
            title: detail.reference,
            subtitle: [
              detail.customerDisplayName,
              detail.productLabel,
              propertyCity || null,
              loanRef || null,
            ]
              .filter(Boolean)
              .join(" · "),
            matchedOn,
            deepLink: `/app/opportunities/${encodeURIComponent(detail.opportunityId)}`,
          });
        }

        for (const doc of detail.documents ?? []) {
          const hay = [doc.title, doc.categoryLabel, doc.fileName || ""]
            .join(" ")
            .toLowerCase();
          if (!hay.includes(q)) continue;
          documentHits.push({
            id: `doc-${doc.documentId}`,
            group: "documents",
            title: doc.title,
            subtitle: [
              doc.categoryLabel,
              detail.reference,
              detail.customerDisplayName,
              doc.statusLabel,
            ]
              .filter(Boolean)
              .join(" · "),
            matchedOn: "Document",
            deepLink: `/app/opportunities/${encodeURIComponent(detail.opportunityId)}/documents`,
          });
        }
      }
    }

    const groups: import("@/types/enterprise-partner-search").PartnerSearchGroupDto[] = (
      [
        {
          id: "customers" as const,
          label: "Customers",
          hits: customerHits.slice(0, 8),
        },
        {
          id: "opportunities" as const,
          label: "Opportunities",
          hits: opportunityHits.slice(0, 8),
        },
        {
          id: "documents" as const,
          label: "Documents",
          hits: documentHits.slice(0, 8),
        },
      ] as const
    ).filter((g) => g.hits.length > 0);

    const totalHits = groups.reduce((n, g) => n + g.hits.length, 0);

    return {
      query: raw,
      groups,
      totalHits,
      dtoSource: "enterprise_partner_search",
      dtoNotice:
        "Partner-scoped Global Search from Catalyst One. Catalyst Connect must not invent or re-rank enterprise results.",
    };
  },

  async createOpportunity(
    userId: string,
    input: PartnerOpportunityCreateInput,
  ): Promise<PartnerOpportunityDetailDto> {
    await assertPartnerAction(userId, "create");
    const binding = await resolvePartnerBindingForUser(userId);
    const partner = binding.partner;
    const partnerId = partner.id;
    invalidatePartnerPipelineCache(partnerId);
    const store = await ensureStore(partnerId);
    const intent = input.intent === "submit" ? "submit" : "draft";
    const displayName = input.customerDisplayName?.trim() || "";
    const mobile = input.customerMobile?.trim() || "";
    const city = input.customerCity?.trim() || null;

    // CO-WP-INT-002 — preferred customer must already be partner-owned (search hits),
    // otherwise create a new ECM contact (do not attach another partner's customer).
    const preferredId = input.customerId?.trim() || null;
    if (preferredId) {
      try {
        await partnerOwnershipService.requireOwnedCustomer({
          organizationId: partner.organizationId,
          wealthPartnerId: partner.id,
          customerId: preferredId,
        });
      } catch {
        throw new PartnerGatewayError(
          "Customer not found or access denied",
          "FORBIDDEN",
          403,
        );
      }
    }

    const contact = await resolveOrCreatePartnerContact({
      organizationId: partner.organizationId,
      actorUserId: userId,
      displayName: displayName || "Partner Customer",
      mobile,
      city,
      preferredContactId: preferredId,
    });

    const customer: PartnerCustomerSearchHitDto = {
      customerId: contact.id,
      displayName: contact.name,
      mobile: contact.mobile,
      city: contact.city,
      dtoSource: "enterprise_opportunity_registry",
    };
    if (!store.customers.some((c) => c.customerId === customer.customerId)) {
      store.customers.unshift(customer);
    }

    const isSubmit = intent === "submit";
    const primaryBorrowerKind = input.primaryBorrowerKind
      ? assertOpportunityPrimaryBorrowerKind(input.primaryBorrowerKind)
      : null;
    const requestedAmount = parseRequestedAmount(input.requiredAmountLabel);
    const lendingExtension = lendingExtensionWithApproxCibil(
      null,
      input.borrowerFields,
      input.productFields,
    );

    // CO-WP-INT-001 — Opportunity Registry is the create SSOT (sourceWealthPartnerId ownership).
    const registryRow = await enterpriseOpportunityRepository.createOpportunity({
      organizationId: partner.organizationId,
      productFamily: "lending",
      productCode: input.productCode?.trim() || null,
      productLabel: input.productLabel?.trim() || null,
      requirementStage: isSubmit ? "requirement_captured" : "lead_creation",
      lifecycleStatus: isSubmit ? "requirement_captured" : "dialogue",
      primaryBorrowerKind: primaryBorrowerKind === "company" ? "company" : "individual",
      primaryContactId: contact.id,
      primaryContactName: contact.name,
      primaryContactMobile: contact.mobile,
      cityLabel: contact.city,
      requestedAmount,
      sourceCode: "wealth_partner",
      sourceWealthPartnerId: partner.id,
      participationRole: "referral",
      lendingExtension: lendingExtension ?? undefined,
      snapshot: {
        partnerCreated: true,
        partnerNotes: input.notes?.trim() || null,
        partnerBorrowerFields: input.borrowerFields ?? null,
        partnerProductFields: input.productFields ?? null,
      },
      actorUserId: userId,
    });

    // CO-NOTIFICATION-001 — notify internal users; partner excluded (own activity)
    try {
      const { enterpriseNotificationService } = await import(
        "@server/services/enterprise-notification/enterprise-notification.service"
      );
      const { eneEventTitle } = await import(
        "@/constants/enterprise-notification-engine"
      );
      const amount =
        requestedAmount != null
          ? `₹${Number(requestedAmount).toLocaleString("en-IN")}`
          : null;
      await enterpriseNotificationService.fanOutBestEffort({
        organizationId: partner.organizationId,
        eventType: "OPPORTUNITY_CREATED",
        sourceEventId: registryRow.id,
        sourceSystem: "opportunity",
        title: eneEventTitle("OPPORTUNITY_CREATED"),
        body: [contact.name, input.productLabel?.trim() || "Product", amount]
          .filter(Boolean)
          .join(" · "),
        description: `Source: Wealth Partner · ${partner.displayName}`,
        actorUserId: userId,
        actorName: partner.displayName,
        opportunityId: registryRow.id,
        contactId: contact.id,
        customerName: contact.name,
        productLabel: input.productLabel?.trim() || null,
        amountLabel: amount,
        href: `/opportunities?opportunityId=${encodeURIComponent(registryRow.id)}`,
        sourceWealthPartnerId: partner.id,
        actorIsPartner: true,
      });
    } catch {
      /* fail-open */
    }

    const createdAt = registryRow.createdAt.toISOString();
    const opportunityId = registryRow.id;
    const sourceAttribution = {
      sourcePartnerId: partner.id,
      sourcePartnerName: partner.displayName,
      sourcePartnerCode: partner.code,
      sourceType: "wealth_partner",
      organizationId: partner.organizationId,
      branchLabel: partner.cityLabel ?? null,
      territoryLabel: null as string | null,
      hiddenFromPartnerUi: true as const,
    };
    const detail: PartnerOpportunityDetailDto = {
      opportunityId,
      reference: registryRow.opportunityNumber,
      customerId: contact.id,
      customerDisplayName: contact.name,
      productCode: input.productCode?.trim() || null,
      productLabel: input.productLabel?.trim() || "Not Specified",
      requiredAmountLabel:
        requestedAmount != null
          ? formatAmountLabel(requestedAmount)
          : input.requiredAmountLabel?.trim() || "Not Specified",
      stageLabel: isSubmit ? "Requirement Captured" : "Draft",
      lifecycleStatus: isSubmit ? "active" : "draft",
      ownerLabel: "You",
      updatedAt: createdAt,
      createdAt,
      notes: input.notes?.trim() || "",
      primaryBorrowerKind,
      borrowerFields: input.borrowerFields ?? {},
      productFields: input.productFields ?? {},
      sourceAttribution,
      summary: isSubmit
        ? "Submitted via Partner Gateway — owned on Opportunity Registry."
        : "Draft via Partner Gateway — owned on Opportunity Registry.",
      dtoSource: "enterprise_opportunity_registry",
      dtoNotice: DTO_NOTICE,
      documents: [],
      activities: [
        {
          activityId: `${opportunityId}-act-1`,
          title: isSubmit ? "Submitted" : "Opportunity Created",
          kindLabel: "System",
          occurredAt: createdAt,
          body: isSubmit
            ? "Opportunity submitted to Rupee Catalyst."
            : "Opportunity draft created on Enterprise Opportunity Registry.",
          dtoSource: "enterprise_opportunity_registry",
        },
      ],
      timeline: [
        {
          eventId: `${opportunityId}-tl-1`,
          title: isSubmit ? "Opportunity submitted" : "Opportunity created",
          occurredAt: createdAt,
          body: "Recorded on Enterprise Opportunity Registry.",
          dtoSource: "enterprise_opportunity_registry",
        },
      ],
      loanFile: {
        available: false,
        fileId: null,
        fileReference: null,
        stageLabel: null,
        lenderLabel: null,
        amountLabel: null,
        statusLabel: "Not attached",
        message: "Deal / Loan File attaches after lender identification in Catalyst One.",
        dtoSource: "enterprise_opportunity_registry",
        dtoNotice: DTO_NOTICE,
      },
    };
    if (isSubmit) emitEnterpriseSubmitEvents(detail);
    const hydrated = applyHealth(detail);
    store.opportunities.set(opportunityId, hydrated);
    await persistStore(partnerId, store);
    return hydrated;
  },

  async patchOpportunity(
    userId: string,
    opportunityId: string,
    input: PartnerOpportunityPatchInput,
  ): Promise<PartnerOpportunityDetailDto> {
    const { owned } = await assertOwnedOpportunityAction(userId, "edit", opportunityId);
    const { partnerId, store, detail } = await requireDetail(userId, owned.id);
    invalidatePartnerPipelineCache(partnerId);

    const requestedAmount =
      input.requiredAmountLabel !== undefined
        ? parseRequestedAmount(input.requiredAmountLabel)
        : undefined;

    // CO-WP-INT-001 — Registry write first (SSOT). Placeholder mirrors for Connect UX only.
    const existing = await enterpriseOpportunityRepository.findById(
      owned.organizationId,
      owned.id,
    );
    const prevSnap =
      existing?.snapshot &&
      typeof existing.snapshot === "object" &&
      !Array.isArray(existing.snapshot)
        ? (existing.snapshot as Record<string, unknown>)
        : {};
    const nextBorrowerFields =
      input.borrowerFields !== undefined
        ? input.borrowerFields
        : detail.borrowerFields ?? null;
    const nextProductFields =
      input.productFields !== undefined
        ? input.productFields
        : detail.productFields ?? null;
    const lendingExtension = lendingExtensionWithApproxCibil(
      existing?.lendingExtension,
      nextBorrowerFields,
      nextProductFields,
    );
    await enterpriseOpportunityRepository.updateOpportunity(owned.organizationId, owned.id, {
      productCode:
        input.productCode !== undefined ? input.productCode.trim() || null : undefined,
      productLabel: input.productLabel !== undefined ? input.productLabel : undefined,
      requestedAmount: requestedAmount === undefined ? undefined : requestedAmount,
      primaryContactName:
        input.borrowerFields?.fullName?.trim() ||
        input.borrowerFields?.customerName?.trim() ||
        undefined,
      primaryContactMobile:
        input.borrowerFields?.mobile?.trim() ||
        input.borrowerFields?.mobilePrimary?.trim() ||
        undefined,
      cityLabel:
        input.borrowerFields?.city?.trim() ||
        input.productFields?.propertyCity?.trim() ||
        undefined,
      snapshot: {
        ...prevSnap,
        partnerNotes: input.notes !== undefined ? input.notes : detail.notes ?? null,
        partnerBorrowerFields:
          input.borrowerFields !== undefined
            ? input.borrowerFields
            : detail.borrowerFields ?? null,
        partnerProductFields:
          input.productFields !== undefined
            ? input.productFields
            : detail.productFields ?? null,
        partnerPatchedAt: nowIso(),
      },
      lendingExtension: lendingExtension ?? undefined,
      updatedBy: userId,
    });

    if (input.requiredAmountLabel !== undefined) {
      detail.requiredAmountLabel =
        requestedAmount != null
          ? formatAmountLabel(requestedAmount)
          : input.requiredAmountLabel.trim() || "Not Specified";
    }
    if (input.notes !== undefined) detail.notes = input.notes;
    if (input.productFields !== undefined) detail.productFields = input.productFields;
    if (input.borrowerFields !== undefined) detail.borrowerFields = input.borrowerFields;
    if (input.productLabel !== undefined) detail.productLabel = input.productLabel;
    if (input.productCode !== undefined) detail.productCode = input.productCode.trim() || null;
    if (input.primaryBorrowerKind !== undefined) {
      detail.primaryBorrowerKind = assertOpportunityPrimaryBorrowerKind(input.primaryBorrowerKind);
    }
    detail.updatedAt = nowIso();
    detail.dtoSource = "enterprise_opportunity_registry";
    detail.summary = "Updated on Enterprise Opportunity Registry.";
    const touchedCustomer =
      input.borrowerFields !== undefined || input.primaryBorrowerKind !== undefined;
    if (touchedCustomer) {
      pushActivity(
        detail,
        "Customer Updated",
        "Customer",
        "Customer details on this Opportunity were updated.",
      );
    }
    pushTimeline(detail, "Progress saved", "Saved to Enterprise Opportunity Registry.");
    const hydrated = applyHealth(detail);
    store.opportunities.set(opportunityId, hydrated);
    await persistStore(partnerId, store);
    return hydrated;
  },

  async submitOpportunity(
    userId: string,
    opportunityId: string,
  ): Promise<PartnerOpportunityDetailDto> {
    const { owned } = await assertOwnedOpportunityAction(
      userId,
      "stage_change",
      opportunityId,
    );
    const { partnerId, store, detail } = await requireDetail(userId, owned.id);
    invalidatePartnerPipelineCache(partnerId);
    const alreadyCaptured =
      owned.lifecycleStatus === "requirement_captured" ||
      owned.requirementStage === "requirement_captured" ||
      detail.lifecycleStatus === "active";
    if (alreadyCaptured && detail.lifecycleStatus !== "draft") {
      return detail;
    }

    // CO-WP-INT-001 — Stage change persists to Opportunity Registry (canonical stages).
    await enterpriseOpportunityRepository.updateOpportunity(owned.organizationId, owned.id, {
      lifecycleStatus: "requirement_captured",
      requirementStage: "requirement_captured",
      updatedBy: userId,
    });

    detail.lifecycleStatus = "active";
    detail.stageLabel = "Requirement Captured";
    detail.summary =
      "Submitted via Partner Gateway — Requirement Captured on Opportunity Registry.";
    detail.dtoSource = "enterprise_opportunity_registry";
    pushActivity(
      detail,
      "Submitted",
      "Opportunity",
      "Opportunity submitted to Rupee Catalyst for enterprise processing.",
    );
    pushTimeline(
      detail,
      "Opportunity submitted",
      "Lifecycle moved to Requirement Captured on Enterprise Opportunity Registry.",
    );
    emitEnterpriseSubmitEvents(detail);
    const hydrated = applyHealth(detail);
    store.opportunities.set(opportunityId, hydrated);
    await persistStore(partnerId, store);
    return hydrated;
  },

  async uploadDocument(
    userId: string,
    opportunityId: string,
    input: PartnerOpportunityDocumentUploadInput,
  ): Promise<PartnerOpportunityDetailDto> {
    const { owned, userDisplayName, partnerDisplayName, partnerId: actorPartnerId } =
      await assertOwnedOpportunityAction(userId, "document_upload", opportunityId);
    const replaceId = input.replaceDocumentId?.trim();
    if (replaceId) {
      await assertOwnedOpportunityAction(userId, "document_edit", owned.id);
    }
    const { partnerId, store, detail } = await requireDetail(userId, owned.id);
    const typeRefIn = input.typeRef?.trim() || "";
    const modeIn = (input.intakeMode || "").trim().toLowerCase();
    const lod = projectPartnerOpportunityLod(detail);
    const lodItem = typeRefIn
      ? lod.items.find((i) => i.typeRef === typeRefIn)
      : undefined;

    /** CO-WP-DOC-002 / CO-WP-DOC-003 — freeform inbox/additional/folder vs checklist. */
    const isFreeform =
      modeIn === "inbox" ||
      modeIn === "additional" ||
      modeIn === "folder" ||
      (!typeRefIn && modeIn !== "requirement") ||
      isUnclassifiedDocumentTypeRef(typeRefIn);

    if (!isFreeform) {
      if (!typeRefIn) {
        throw new PartnerGatewayError(
          "Document typeRef is required when uploading against a pending requirement.",
          "VALIDATION",
          400,
        );
      }
      if (!lodItem) {
        throw new PartnerGatewayError(
          "Document type is not on the Enterprise required list for this Opportunity.",
          "VALIDATION",
          400,
        );
      }
    }

    const typeRef = isFreeform
      ? isUnclassifiedDocumentTypeRef(typeRefIn)
        ? typeRefIn
        : createUnclassifiedDocumentTypeRef()
      : typeRefIn;

    const categoryLabel = isFreeform
      ? input.folderName?.trim() ||
        (modeIn === "additional"
          ? "Additional document"
          : modeIn === "folder"
            ? "Wealth Partner folder"
            : "Customer document")
      : lodItem!.label;

    let dealId: string | null = input.dealId?.trim() || null;
    if (dealId) {
      const deal = await partnerDealService.getDeal(userId, dealId);
      if (deal.opportunityId !== owned.id) {
        throw new PartnerGatewayError(
          "Selected Deal does not belong to this Opportunity.",
          "VALIDATION",
          400,
        );
      }
    }

    const participantId = input.participantId?.trim() || null;
    if (participantId) {
      const allowed = (detail.participants ?? []).some(
        (p) => p.participantId === participantId,
      );
      if (!allowed) {
        throw new PartnerGatewayError(
          "Selected participant is not on this Opportunity.",
          "VALIDATION",
          400,
        );
      }
    }

    const title =
      input.title?.trim() ||
      input.fileName?.trim() ||
      (isFreeform ? categoryLabel : lodItem!.label);
    const sizeBytes =
      typeof input.sizeBytes === "number" && Number.isFinite(input.sizeBytes)
        ? Math.max(0, Math.round(input.sizeBytes))
        : 0;
    if (sizeBytes > 8 * 1024 * 1024) {
      throw new PartnerGatewayError(
        "Each file must be 8 MB or smaller.",
        "VALIDATION",
        400,
      );
    }

    // CO-WP-INT-002 / CO-DOC-ARCH-001 — Durable Opportunity Document Center (same SSOT).
    const persisted = await upsertPartnerOpportunityDocument({
      organizationId: owned.organizationId,
      opportunityId: owned.id,
      opportunityNumber: owned.opportunityNumber,
      contactId: owned.primaryContactId,
      typeRef,
      categoryLabel,
      title,
      fileName: input.fileName?.trim() || title,
      mimeType: input.mimeType?.trim() || "application/octet-stream",
      sizeBytes,
      contentBase64: input.contentBase64?.trim() || null,
      replaceDocumentId: replaceId || null,
      uploadedBy: userDisplayName || partnerDisplayName || userId,
      relativePath: input.relativePath?.trim() || null,
      folderName: input.folderName?.trim() || null,
      packageId: input.packageId?.trim() || null,
      dealId,
      participantId,
      documentScope: participantId
        ? "applicant"
        : input.documentScope || (modeIn === "folder" ? "shared" : "shared"),
    });

    const replaced = Boolean(replaceId);
    const labelForActivity = isFreeform ? title : lodItem!.label;
    const fileLabel = input.fileName
      ? `${labelForActivity} (${input.relativePath || input.fileName})`
      : labelForActivity;
    pushActivity(
      detail,
      replaced ? "Document Replaced" : "Document Uploaded",
      "Document",
      `${fileLabel} ${replaced ? "replaced" : "uploaded"} via Catalyst Connect.`,
    );
    pushTimeline(
      detail,
      modeIn === "folder" ? "Folder document uploaded" : "Document uploaded",
      isFreeform
        ? `${fileLabel} received via Wealth Partner Document Desk (Source: Catalyst Connect). Awaiting Catalyst One review.`
        : `${fileLabel} added for Enterprise LOD item (awaiting Catalyst One review).`,
    );

    await enterpriseActivityService.emitBestEffort({
      eventKind: EAR_EVENT_KINDS.DOCUMENTS,
      sourceSystem: EAR_SOURCE_SYSTEMS.PARTNER,
      sourceEventId: `wp-doc:${persisted.documentId}:${replaced ? "replaced" : "uploaded"}`,
      title: replaced
        ? "replaced a document via Catalyst Connect"
        : "uploaded a document via Catalyst Connect",
      summary: `${partnerDisplayName} ${replaced ? "replaced" : "uploaded"} ${input.fileName || labelForActivity}${
        input.folderName ? ` in folder “${input.folderName}”` : ""
      }. Source: Catalyst Connect.`,
      payload: {
        source: "catalyst_connect",
        partnerId: actorPartnerId,
        partnerName: partnerDisplayName,
        folderName: input.folderName?.trim() || null,
        relativePath: input.relativePath?.trim() || null,
        uploadSource: "wealth_partner",
      },
      opportunityId: owned.id,
      dealId,
      contactId: owned.primaryContactId,
      documentId: persisted.documentId,
      actorUserId: userId,
      actorName: userDisplayName || partnerDisplayName,
    });

    if (input.packageComplete && input.packageId?.trim()) {
      const count = Math.max(1, Math.round(Number(input.packageFileCount) || 1));
      await enterpriseActivityService.emitBestEffort({
        eventKind: EAR_EVENT_KINDS.DOCUMENTS,
        sourceSystem: EAR_SOURCE_SYSTEMS.PARTNER,
        sourceEventId: `wp-folder:${input.packageId.trim()}:complete`,
        title: "uploaded documents via Catalyst Connect",
        summary: `${partnerDisplayName} uploaded ${count} document${count === 1 ? "" : "s"}${
          input.folderName ? ` (Folder: ${input.folderName})` : ""
        }. Source: Catalyst Connect.`,
        payload: {
          source: "catalyst_connect",
          partnerId: actorPartnerId,
          partnerName: partnerDisplayName,
          folderName: input.folderName?.trim() || null,
          fileCount: count,
          uploadSource: "wealth_partner",
        },
        opportunityId: owned.id,
        dealId,
        contactId: owned.primaryContactId,
        actorUserId: userId,
        actorName: userDisplayName || partnerDisplayName,
      });
    }
    if (detail.stageLabel === "Draft" || detail.stageLabel === "Requirement Captured") {
      detail.stageLabel = "Documents";
    }
    store.opportunities.set(owned.id, applyHealth(detail));
    await persistStore(partnerId, store);
    return this.getOpportunity(userId, owned.id);
  },

  /**
   * Soft-delete a partner-visible upload on an owned Opportunity (Document Registry).
   */
  async deleteDocument(
    userId: string,
    opportunityId: string,
    documentId: string,
  ): Promise<PartnerOpportunityDetailDto> {
    const { owned } = await assertOwnedOpportunityAction(
      userId,
      "document_edit",
      opportunityId,
    );
    const { partnerId, store, detail } = await requireDetail(userId, owned.id);
    if ((detail.lifecycleStatus || "").toLowerCase() !== "draft") {
      throw new PartnerGatewayError(
        "Documents can only be deleted before the Opportunity is submitted.",
        "VALIDATION",
        400,
      );
    }
    const id = documentId.trim();
    if (!id) {
      throw new PartnerGatewayError("documentId is required.", "VALIDATION", 400);
    }

    const removed = await softDeletePartnerOpportunityDocument({
      organizationId: owned.organizationId,
      opportunityId: owned.id,
      documentId: id,
    });
    if (!removed) {
      throw new PartnerGatewayError(
        "Document not found on this Opportunity.",
        "NOT_FOUND",
        404,
      );
    }

    pushActivity(
      detail,
      "Document Removed",
      "Document",
      "Partner removed upload before enterprise submission.",
    );
    pushTimeline(detail, "Document removed", "Upload removed from Enterprise Document Registry.");
    store.opportunities.set(owned.id, applyHealth(detail));
    await persistStore(partnerId, store);
    return this.getOpportunity(userId, owned.id);
  },

  async listDocuments(
    userId: string,
    opportunityId: string,
  ): Promise<PartnerOpportunityDocumentDto[]> {
    const detail = await this.getOpportunity(userId, opportunityId);
    return detail.documents;
  },

  /** CO-WP-LOD-001 — Full Enterprise LOD checklist with upload status. */
  async getLod(userId: string, opportunityId: string) {
    const detail = await this.getOpportunity(userId, opportunityId);
    return detail.lod ?? projectPartnerOpportunityLod(detail);
  },

  async listActivities(
    userId: string,
    opportunityId: string,
  ): Promise<PartnerOpportunityActivityDto[]> {
    const detail = await this.getOpportunity(userId, opportunityId);
    return detail.activities;
  },

  /**
   * CO-WP-ACCESS-001 / CO-WP-INT-002 — Activity / Notepad independent from EDIT.
   * Writes Enterprise Business Notes (SSOT). Reads hydrate from the same SSOT.
   */
  async addActivity(
    userId: string,
    opportunityId: string,
    input: { title?: string; body: string; kindLabel?: string },
  ): Promise<PartnerOpportunityDetailDto> {
    const { owned, partnerId, partnerDisplayName, userDisplayName } =
      await assertOwnedOpportunityAction(userId, "activity_add", opportunityId);
    const body = (input.body || "").trim();
    if (!body) {
      throw new PartnerGatewayError("Activity body is required", "VALIDATION", 400);
    }
    const title = (input.title || "").trim() || "Notepad";
    const kindLabel = (input.kindLabel || "").trim() || "Notepad";

    const note = await enterpriseBusinessNotesService.create(
      {
        body: `${body}\n— ${userDisplayName} · Partner ${partnerDisplayName} (${partnerId})`,
        category: "general",
        workspaceKind: "opportunity",
        entityKind: "opportunity",
        entityId: owned.id,
        opportunityId: owned.id,
        contactId: owned.primaryContactId,
      },
      { userId, displayName: userDisplayName },
    );
    if (!note) {
      throw new PartnerGatewayError(
        enterpriseBusinessNotesService.isDurable()
          ? "Failed to persist activity to Enterprise Business Notes"
          : "Partner Activity requires ENTERPRISE_PERSISTENCE_MODE=prisma",
        "PERSISTENCE_FAILED",
        enterpriseBusinessNotesService.isDurable() ? 500 : 503,
      );
    }

    const { store, detail } = await requireDetail(userId, owned.id);
    pushActivity(detail, title, kindLabel, body);
    store.opportunities.set(owned.id, applyHealth(detail));
    await persistStore(partnerId, store);
    return this.getOpportunity(userId, owned.id);
  },

  async listTimeline(
    userId: string,
    opportunityId: string,
  ): Promise<PartnerOpportunityTimelineEventDto[]> {
    const detail = await this.getOpportunity(userId, opportunityId);
    return detail.timeline ?? [];
  },

  async getLoanFileView(
    userId: string,
    opportunityId: string,
  ): Promise<PartnerOpportunityLoanFileViewDto> {
    const detail = await this.getOpportunity(userId, opportunityId);
    return detail.loanFile;
  },

  /** CO-WP-INT-002 — Customer directory from owned Opportunity primary contacts (ECM). */
  async listCustomerDirectory(userId: string): Promise<PartnerCustomerDirectoryDto> {
    await assertPartnerAction(userId, "view");
    const ctx = await resolvePartnerContext(userId);
    const owned = await partnerOwnershipService.listOwnedCustomerIds({
      organizationId: ctx.organizationId,
      wealthPartnerId: ctx.partnerId,
    });
    const customers = await Promise.all(
      owned.map(async (row) => {
        const ecm = await loadEcmContactForPartner(row.customerId);
        return {
          customerId: row.customerId,
          displayName: ecm?.name || row.displayName || "Not Specified",
          mobile: ecm?.mobilePrimary || row.mobile || "",
          city: ecm?.city || row.city,
          customerTypeLabel: ecm ? "Customer" : "Individual",
          activeOpportunityCount: row.activeOpportunityCount || row.opportunityCount,
          relationshipHealthLabel:
            row.activeOpportunityCount > 0 ? "On track" : "New",
          lastInteractionAt: row.lastUpdatedAt.toISOString(),
          dtoSource: "enterprise_customer_registry" as const,
        };
      }),
    );
    return {
      partnerId: ctx.partnerId,
      title: "Customers",
      subtitle: "Enterprise Customer Registry projection — partners see only sourced customers.",
      customers,
      emptyState: {
        title: "No customers yet",
        message: "Customers appear when Opportunities are created for them.",
        ctaLabel: "New Opportunity",
        ctaDeepLink: "/app/opportunities/new",
      },
      dtoSource: "enterprise_customer_registry",
      dtoNotice:
        "Customer identity is owned by the Enterprise Customer Registry. Visibility is partner-scoped via Opportunity sourcing.",
    };
  },

  /** CO-WP-INT-002 — Customer workspace; cross-partner access → 403. */
  async getCustomerWorkspace(
    userId: string,
    customerId: string,
  ): Promise<PartnerCustomerWorkspaceDto> {
    await assertPartnerAction(userId, "view");
    const binding = await resolvePartnerBindingForUser(userId);
    const partnerId = binding.partner.id;
    const organizationId = binding.partner.organizationId;

    await partnerOwnershipService.requireOwnedCustomer({
      organizationId,
      wealthPartnerId: partnerId,
      customerId,
    });

    const ecm = await loadEcmContactForPartner(customerId);
    const fallback = {
      customerId,
      displayName: ecm?.name || "Not Specified",
      mobile: ecm?.mobilePrimary || "",
      city: ecm?.city ?? null,
      dtoSource: "enterprise_customer_registry" as const,
    };

    // Opportunities for this customer from Registry ownership (not placeholder Map).
    const ownedOpps = await partnerOwnershipService.listOwnedOpportunities({
      organizationId,
      wealthPartnerId: partnerId,
    });
    const linked = ownedOpps.filter((o) => o.primaryContactId === customerId);
    const store = await ensureStore(partnerId);
    const opps = [];
    for (const row of linked) {
      let detail = store.opportunities.get(row.id);
      if (!detail) {
        detail = skeletonDetailFromOwned(row, {
          id: partnerId,
          displayName: binding.partner.displayName,
          organizationId,
        });
        store.opportunities.set(row.id, detail);
      }
      const notes = await listPartnerVisibleOpportunityNotes({
        opportunityId: row.id,
        contactId: customerId,
      });
      detail = {
        ...detail,
        customerId,
        activities: notes.activities,
        noteEntries: notes.noteEntries,
        documents: await listPartnerOpportunityDocuments({
          organizationId,
          opportunityId: row.id,
        }),
      };
      opps.push(applyHealth(detail));
    }
    stores.set(partnerId, store);

    return composePartnerCustomerWorkspace({
      customerId,
      fallback,
      ecm,
      opportunities: opps,
      partnerDisplayLabel: binding.partner.displayName || "You",
    });
  },
};

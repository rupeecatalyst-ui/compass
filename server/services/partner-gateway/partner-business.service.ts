/**
 * CO-WP-DEVELOPMENT-WAVE-001 / CO-WP-JOURNEY-001C / CO-WP-JOURNEY-002 — Partner Business placeholder.
 *
 * PLACEHOLDER DTOs only — not Opportunity Registry SSOT.
 * JOURNEY-002 enriches workspace projection fields on get/create/patch/submit.
 */
import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import { Prisma } from "@prisma/client";
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
  listPartnerLodMissingLabels,
  projectPartnerOpportunityLod,
} from "@/lib/enterprise-partner-lod";
import {
  PartnerGatewayError,
  resolvePartnerBindingForUser,
} from "./partner-binding.service";

const DTO_SOURCE = "placeholder_partner_business" as const;
const DTO_NOTICE =
  "PLACEHOLDER Enterprise DTO — replace with Partner Opportunity Registry projection without redesign.";

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

  detail.lenders = detail.lenders?.length
    ? detail.lenders
    : [
        {
          lenderId: `${detail.opportunityId}-lender-assigned`,
          lenderLabel: detail.loanFile?.lenderLabel || "Not Specified",
          statusLabel: detail.loanFile?.available ? "Assigned" : "Not assigned",
          offerLabel: null,
          dtoSource: DTO_SOURCE,
          dtoNotice: "Presentation only — lender pipeline owned by Catalyst One Deal Registry.",
        },
      ];

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

function mergeDeterministicSeeds(partnerId: string, store: Store): void {
  for (let i = 0; i < 6; i += 1) {
    const legacyId = seedOpportunityId(partnerId, i);
    const modernId = `opp-seed-${i}`;
    if (!store.opportunities.has(legacyId) && !store.opportunities.has(modernId)) {
      const row = seedOpportunity(partnerId, i);
      store.opportunities.set(row.opportunityId, row);
    }
  }
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

function requireDetail(userId: string, opportunityId: string): Promise<{
  partnerId: string;
  store: Store;
  detail: PartnerOpportunityDetailDto;
}> {
  return (async () => {
    const partnerId = await resolvePartner(userId);
    const store = await ensureStore(partnerId);
    const id = decodeURIComponent(opportunityId || "").trim();
    let detail = store.opportunities.get(id);
    if (!detail) {
      const reconstructed = tryReconstructSeedOpportunity(partnerId, id);
      if (reconstructed) {
        store.opportunities.set(reconstructed.opportunityId, reconstructed);
        await persistStore(partnerId, store);
        detail = reconstructed;
      }
    }
    if (!detail) {
      throw new PartnerGatewayError("Opportunity not found", "NOT_FOUND", 404);
    }
    if (!detail.timeline) detail.timeline = [];
    return { partnerId, store, detail };
  })();
}

export const partnerBusinessService = {
  async getHub(userId: string): Promise<PartnerBusinessHubDto> {
    const partnerId = await resolvePartner(userId);
    const store = await ensureStore(partnerId);
    // CO-PERF — Hub read must not persist on every open.
    stores.set(partnerId, store);
    const details = [...store.opportunities.values()].map(applyHealth);
    const items = details
      .map(toSummary)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const draft = details
      .filter((d) => d.lifecycleStatus === "draft")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    return {
      partnerId,
      title: "Business",
      subtitle: "Your opportunities",
      opportunityCount: items.length,
      opportunities: items,
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
      emptyState: {
        title: "No opportunities yet",
        message: "Start a New Opportunity journey for a customer.",
        ctaLabel: "New Opportunity",
        ctaDeepLink: "/app/opportunities/new",
      },
      dtoSource: DTO_SOURCE,
      dtoNotice: DTO_NOTICE,
    };
  },

  /** CO-WP-BUSINESS-001 — My Business Pipeline Workspace aggregate. */
  async getBusinessPipeline(userId: string): Promise<PartnerBusinessPipelineDto> {
    const partnerId = await resolvePartner(userId);
    const store = await ensureStore(partnerId);
    // CO-PERF — Read path must not write. Keep memory warm only.
    stores.set(partnerId, store);
    const details = [...store.opportunities.values()].map((d) =>
      applyHealth({
        ...d,
        documents: [...(d.documents ?? [])],
        activities: [...(d.activities ?? [])],
        timeline: [...(d.timeline ?? [])],
      }),
    );
    return buildBusinessPipelineDto(partnerId, details, store.customers);
  },

  async listOpportunities(userId: string): Promise<PartnerOpportunitySummaryDto[]> {
    const hub = await this.getHub(userId);
    return hub.opportunities;
  },

  async getOpportunity(userId: string, opportunityId: string): Promise<PartnerOpportunityDetailDto> {
    const { detail } = await requireDetail(userId, opportunityId);
    return applyHealth(detail);
  },

  async searchCustomers(
    userId: string,
    query: string,
  ): Promise<PartnerCustomerSearchHitDto[]> {
    const partnerId = await resolvePartner(userId);
    const store = await ensureStore(partnerId);
    const q = query.trim().toLowerCase();
    if (!q) return store.customers;
    return store.customers.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        c.mobile.replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
        (c.city ?? "").toLowerCase().includes(q),
    );
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
    const binding = await resolvePartnerBindingForUser(userId);
    const partner = binding.partner;
    const partnerId = partner.id;
    const store = await ensureStore(partnerId);
    const intent = input.intent === "submit" ? "submit" : "draft";
    const customer =
      store.customers.find((c) => c.customerId === input.customerId) ??
      ({
        customerId: input.customerId || `cust-ph-${Date.now()}`,
        displayName: input.customerDisplayName?.trim() || "New Customer",
        mobile: input.customerMobile?.trim() || "Not Specified",
        city: input.customerCity?.trim() || null,
        dtoSource: DTO_SOURCE,
      } satisfies PartnerCustomerSearchHitDto);

    if (!store.customers.some((c) => c.customerId === customer.customerId)) {
      store.customers.unshift(customer);
    }

    const createdAt = nowIso();
    const opportunityId = `opp-ph-${partnerId.slice(0, 8)}-${Date.now()}`;
    const isSubmit = intent === "submit";
    const primaryBorrowerKind = input.primaryBorrowerKind
      ? assertOpportunityPrimaryBorrowerKind(input.primaryBorrowerKind)
      : null;
    /** Catalyst Connect constitution §5 — Source never partner-editable; stamped here. */
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
      reference: nextOpportunityReference(store.opportunities.size + 145),
      customerId: customer.customerId,
      customerDisplayName: customer.displayName,
      productCode: input.productCode?.trim() || null,
      productLabel: input.productLabel?.trim() || "Not Specified",
      requiredAmountLabel: input.requiredAmountLabel?.trim() || "Not Specified",
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
        ? "Submitted via Partner Business placeholder API. Not persisted to Opportunity Registry SSOT."
        : "Saved as draft via Partner Business placeholder API. Not persisted to Opportunity Registry SSOT.",
      dtoSource: DTO_SOURCE,
      dtoNotice: DTO_NOTICE,
      documents: [],
      activities: [
        {
          activityId: `${opportunityId}-act-1`,
          title: isSubmit ? "Submitted" : "Opportunity Created",
          kindLabel: "System",
          occurredAt: createdAt,
          body: isSubmit
            ? "Opportunity submitted to Rupee Catalyst for enterprise processing."
            : `${customer.displayName} · ${input.productLabel?.trim() || "Opportunity"} draft started.`,
          dtoSource: DTO_SOURCE,
        },
      ],
      timeline: [
        {
          eventId: `${opportunityId}-tl-1`,
          title: isSubmit ? "Opportunity submitted" : "Draft saved",
          occurredAt: createdAt,
          body: primaryBorrowerKind
            ? `New Opportunity journey · Primary Borrower: ${primaryBorrowerKind}.`
            : "New Opportunity journey continued from Business Home.",
          dtoSource: DTO_SOURCE,
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
        message: "Loan File attaches after Move to Deal in Catalyst One.",
        dtoSource: DTO_SOURCE,
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
    const { partnerId, store, detail } = await requireDetail(userId, opportunityId);
    if (input.requiredAmountLabel !== undefined) {
      detail.requiredAmountLabel = input.requiredAmountLabel.trim() || "Not Specified";
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
    // Autosave / draft progress stays internal — not partner Activity Timeline.
    pushTimeline(detail, "Progress saved", "Autosave / draft update.");
    const hydrated = applyHealth(detail);
    store.opportunities.set(opportunityId, hydrated);
    await persistStore(partnerId, store);
    return hydrated;
  },

  async submitOpportunity(
    userId: string,
    opportunityId: string,
  ): Promise<PartnerOpportunityDetailDto> {
    const { partnerId, store, detail } = await requireDetail(userId, opportunityId);
    if (detail.lifecycleStatus !== "draft") {
      return detail;
    }
    detail.lifecycleStatus = "active";
    detail.stageLabel = "Requirement Captured";
    detail.summary =
      "Submitted via Partner Business placeholder API. Not persisted to Opportunity Registry SSOT.";
    pushActivity(detail, "Submitted", "Opportunity", "Opportunity submitted to Rupee Catalyst for enterprise processing.");
    pushTimeline(detail, "Opportunity submitted", "Journey moved from Draft to active.");
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
    const { partnerId, store, detail } = await requireDetail(userId, opportunityId);
    const typeRef = input.typeRef?.trim();
    if (!typeRef) {
      throw new PartnerGatewayError(
        "Document typeRef is required — upload against the Enterprise LOD checklist only.",
        "VALIDATION",
        400,
      );
    }

    const lod = projectPartnerOpportunityLod(detail);
    const lodItem = lod.items.find((i) => i.typeRef === typeRef);
    if (!lodItem) {
      throw new PartnerGatewayError(
        "Document type is not on the Enterprise required list for this Opportunity.",
        "VALIDATION",
        400,
      );
    }

    const title = input.title?.trim() || input.fileName?.trim() || lodItem.label;
    const replaceId = input.replaceDocumentId?.trim();
    let documents = [...(detail.documents ?? [])];
    if (replaceId) {
      documents = documents.filter((d) => d.documentId !== replaceId);
    } else if (!input.append) {
      documents = documents.filter((d) => d.typeRef !== typeRef);
    }

    const sizeBytes =
      typeof input.sizeBytes === "number" && Number.isFinite(input.sizeBytes)
        ? Math.max(0, Math.round(input.sizeBytes))
        : null;
    if (sizeBytes != null && sizeBytes > 8 * 1024 * 1024) {
      throw new PartnerGatewayError(
        "Each file must be 8 MB or smaller.",
        "VALIDATION",
        400,
      );
    }

    let previewDataUrl: string | null = null;
    const rawContent = input.contentBase64?.trim();
    if (rawContent) {
      const asDataUrl = rawContent.startsWith("data:")
        ? rawContent
        : `data:${input.mimeType || "application/octet-stream"};base64,${rawContent}`;
      // Keep small previews only (images) to avoid blowing Partner profile JSON.
      const mime = (input.mimeType || "").toLowerCase();
      if (mime.startsWith("image/") && asDataUrl.length <= 350_000) {
        previewDataUrl = asDataUrl;
      }
    }

    const doc: PartnerOpportunityDocumentDto = {
      documentId: `${opportunityId}-doc-${Date.now()}`,
      title,
      statusLabel: "Uploaded",
      categoryLabel: lodItem.label,
      typeRef,
      fileName: input.fileName?.trim() || title,
      mimeType: input.mimeType?.trim() || null,
      sizeBytes,
      previewDataUrl,
      uploadedByLabel: "Wealth Partner",
      updatedAt: nowIso(),
      dtoSource: DTO_SOURCE,
    };
    detail.documents = [doc, ...documents];
    const replaced = Boolean(replaceId);
    pushActivity(
      detail,
      replaced ? "Document Replaced" : "Document Uploaded",
      "Document",
      `${lodItem.label}${input.fileName ? ` (${input.fileName})` : ""} ${replaced ? "replaced" : "uploaded"}.`,
    );
    pushTimeline(
      detail,
      "Document uploaded",
      `${lodItem.label}${input.fileName ? ` (${input.fileName})` : ""} added via Enterprise LOD.`,
    );
    if (detail.stageLabel === "Draft" || detail.stageLabel === "Requirement Captured") {
      detail.stageLabel = "Documents";
    }
    const hydrated = applyHealth(detail);
    store.opportunities.set(opportunityId, hydrated);
    await persistStore(partnerId, store);
    return hydrated;
  },

  /**
   * Remove an LOD upload before enterprise submit only.
   * Never invents checklist types — deletes only a Partner-uploaded stub matched by documentId.
   */
  async deleteDocument(
    userId: string,
    opportunityId: string,
    documentId: string,
  ): Promise<PartnerOpportunityDetailDto> {
    const { partnerId, store, detail } = await requireDetail(userId, opportunityId);
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
    const existing = (detail.documents ?? []).find((d) => d.documentId === id);
    if (!existing) {
      throw new PartnerGatewayError("Document not found on this Opportunity.", "NOT_FOUND", 404);
    }
    detail.documents = (detail.documents ?? []).filter((d) => d.documentId !== id);
    pushActivity(
      detail,
      "Document Removed",
      "Document",
      "Partner removed upload before enterprise submission.",
    );
    pushTimeline(
      detail,
      "Document removed",
      `${existing.categoryLabel || existing.title} removed before submission.`,
    );
    const hydrated = applyHealth(detail);
    store.opportunities.set(opportunityId, hydrated);
    await persistStore(partnerId, store);
    return hydrated;
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

  /** CO-WP-JOURNEY-003 / CO-WP-CUSTOMER-001 — Customer directory (ECR enrichment). */
  async listCustomerDirectory(userId: string): Promise<PartnerCustomerDirectoryDto> {
    const partnerId = await resolvePartner(userId);
    const store = await ensureStore(partnerId);
    const customers = await Promise.all(
      store.customers.map(async (c) => {
        const ecm = await loadEcmContactForPartner(c.customerId);
        const opps = [...store.opportunities.values()].filter((o) => o.customerId === c.customerId);
        const active = opps.filter(
          (o) =>
            !["won", "lost", "disbursed", "closed", "cancelled"].includes(
              (o.lifecycleStatus || "").toLowerCase(),
            ) && !(o.stageLabel || "").toLowerCase().includes("disbursed"),
        ).length;
        const last = opps
          .map((o) => o.updatedAt)
          .sort()
          .at(-1);
        return {
          customerId: c.customerId,
          displayName: ecm?.name || c.displayName,
          mobile: ecm?.mobilePrimary || c.mobile,
          city: ecm?.city || c.city,
          customerTypeLabel: ecm ? "Customer" : "Individual",
          activeOpportunityCount: active || opps.length,
          relationshipHealthLabel: active > 0 ? "On track" : "New",
          lastInteractionAt: last || ecm?.lastActiveOn || nowIso(),
          dtoSource: DTO_SOURCE,
        };
      }),
    );
    return {
      partnerId,
      title: "Customers",
      subtitle: "Enterprise Customer Registry projection — Connect does not store customers.",
      customers,
      emptyState: {
        title: "No customers yet",
        message: "Customers appear when Opportunities are created for them.",
        ctaLabel: "New Opportunity",
        ctaDeepLink: "/app/opportunities/new",
      },
      dtoSource: DTO_SOURCE,
      dtoNotice:
        "Customer identity is owned by the Enterprise Customer Registry. Catalyst Connect is presentation only.",
    };
  },

  /** CO-WP-CUSTOMER-001 — Lightweight Customer Workspace from Enterprise Customer Registry. */
  async getCustomerWorkspace(
    userId: string,
    customerId: string,
  ): Promise<PartnerCustomerWorkspaceDto> {
    const binding = await resolvePartnerBindingForUser(userId);
    const partnerId = binding.partner.id;
    const store = await ensureStore(partnerId);
    const customer = store.customers.find((c) => c.customerId === customerId);
    const ecm = await loadEcmContactForPartner(customerId);

    if (!customer && !ecm) {
      throw new PartnerGatewayError("Customer not found", "NOT_FOUND", 404);
    }

    const fallback = customer ?? {
      customerId,
      displayName: ecm!.name,
      mobile: ecm!.mobilePrimary,
      city: ecm!.city ?? null,
      dtoSource: DTO_SOURCE,
    };

    // Ensure directory can resolve this ECR customer on next list
    if (!customer && ecm && !store.customers.some((c) => c.customerId === customerId)) {
      store.customers.unshift(fallback);
      await persistStore(partnerId, store);
    }

    const opps = [...store.opportunities.values()]
      .filter((o) => o.customerId === customerId)
      .map((o) =>
        applyHealth({
          ...o,
          documents: [...o.documents],
          activities: [...o.activities],
          timeline: [...o.timeline],
        }),
      );

    return composePartnerCustomerWorkspace({
      customerId,
      fallback,
      ecm,
      opportunities: opps,
      partnerDisplayLabel: binding.partner.displayName || "You",
    });
  },
};

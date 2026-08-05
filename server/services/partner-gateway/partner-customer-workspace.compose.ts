/**
 * CO-WP-CUSTOMER-001 — Project Partner Customer Workspace from Enterprise Customer Registry.
 * Connect consumes this DTO only — never maintains a parallel customer database.
 */

import { isDatabaseAvailable } from "@server/lib/prisma";
import { ecmContactRepository } from "@server/repositories/ecm/contact.repository";
import { listTasksForEntity } from "@/lib/enterprise-task-engine";
import {
  resolveTaskStatus,
  resolveWorkType,
  taskTitle,
} from "@/lib/enterprise-task-engine/task-workspace";
import type { PartnerOpportunityDetailDto } from "@/types/enterprise-partner-business";
import type {
  PartnerCustomerCommunicationDto,
  PartnerCustomerContactInfoDto,
  PartnerCustomerDocumentDto,
  PartnerCustomerFollowUpDto,
  PartnerCustomerNoteDto,
  PartnerCustomerOpportunityRowDto,
  PartnerCustomerProfileDto,
  PartnerCustomerTaskDto,
  PartnerCustomerWorkspaceDto,
} from "@/types/enterprise-partner-customer-workspace";
import type { EcmContact } from "@/types/enterprise-contact-master";
import type { PartnerCustomerSearchHitDto } from "@/types/enterprise-partner-business";

const DTO_SOURCE = "enterprise_customer_registry" as const;

function isPreviousLifecycle(life: string, stage: string): boolean {
  const l = life.toLowerCase();
  const s = stage.toLowerCase();
  return (
    l === "won" ||
    l === "lost" ||
    l === "disbursed" ||
    l === "closed" ||
    l === "cancelled" ||
    s.includes("disbursed") ||
    s.includes("lost") ||
    s.includes("closed")
  );
}

function yearLabel(iso: string | undefined): string {
  if (!iso) return "Not Specified";
  try {
    return String(new Date(iso).getFullYear());
  } catch {
    return "Not Specified";
  }
}

function mapOpportunityRow(
  o: PartnerOpportunityDetailDto,
  bucket: "active" | "previous",
): PartnerCustomerOpportunityRowDto {
  return {
    opportunityId: o.opportunityId,
    reference: o.reference,
    productLabel: o.productLabel,
    requiredAmountLabel: o.requiredAmountLabel,
    stageLabel: o.businessTimeline?.currentLabel || o.stageLabel,
    lifecycleStatus: o.lifecycleStatus,
    updatedAt: o.updatedAt,
    workspaceDeepLink: `/app/opportunities/${o.opportunityId}`,
    bucket,
    dtoSource: DTO_SOURCE,
  };
}

function buildContactInfo(
  ecm: EcmContact | null,
  fallback: PartnerCustomerSearchHitDto,
): PartnerCustomerContactInfoDto {
  if (ecm) {
    const email = ecm.officialEmail || ecm.personalEmail || null;
    const filled = [ecm.mobilePrimary, email, ecm.city, ecm.address].filter(Boolean).length;
    return {
      mobilePrimary: ecm.mobilePrimary || fallback.mobile || "Not Specified",
      mobileSecondary: ecm.mobileSecondary || null,
      email,
      city: ecm.city || fallback.city,
      state: ecm.state || null,
      address: ecm.address || null,
      contactCompletenessLabel:
        filled >= 3 ? "Complete" : filled >= 2 ? "Partial" : "Provisional",
    };
  }
  return {
    mobilePrimary: fallback.mobile || "Not Specified",
    mobileSecondary: null,
    email: null,
    city: fallback.city,
    state: null,
    address: null,
    contactCompletenessLabel: "Provisional",
  };
}

function buildProfile(input: {
  ecm: EcmContact | null;
  fallback: PartnerCustomerSearchHitDto;
  products: string[];
  healthLabel: string;
  healthPercent: number;
  partnerLabel: string;
  summary: string;
}): PartnerCustomerProfileDto {
  const { ecm, fallback, products, healthLabel, healthPercent, partnerLabel, summary } = input;
  const typeLabel = ecm?.roles?.includes("customer")
    ? "Customer"
    : ecm
      ? "Contact"
      : "Individual";
  return {
    displayName: ecm?.name || fallback.displayName,
    customerTypeLabel: typeLabel,
    relationshipSinceLabel: yearLabel(ecm?.createdOn),
    relationshipHealthLabel: healthLabel,
    relationshipHealthPercent: healthPercent,
    assignedWealthPartnerLabel: ecm?.ownerName || partnerLabel,
    productsAvailed: products.length ? products : ["Not Specified"],
    summary,
    registrySourceLabel: ecm
      ? "Enterprise Customer Registry"
      : "Partner-linked projection (Registry enrichment pending)",
  };
}

function projectTasks(contactId: string): PartnerCustomerTaskDto[] {
  try {
    const tasks = listTasksForEntity({ contactId });
    return tasks.slice(0, 40).map((t) => {
      const status = resolveTaskStatus(t);
      return {
        taskId: t.id,
        title: taskTitle(t),
        statusLabel: status === "completed" ? "Completed" : status === "open" ? "Open" : status,
        dueLabel: t.dueOn
          ? new Date(t.dueOn).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "No due date",
        workTypeLabel: resolveWorkType(t),
        dtoSource: DTO_SOURCE,
      };
    });
  } catch {
    return [];
  }
}

function projectFollowUps(
  tasks: PartnerCustomerTaskDto[],
  activities: { activityId: string; title: string; body: string; occurredAt: string; kindLabel: string }[],
): PartnerCustomerFollowUpDto[] {
  const fromTasks: PartnerCustomerFollowUpDto[] = tasks
    .filter((t) => t.statusLabel === "Open")
    .map((t) => ({
      followUpId: `fu-task-${t.taskId}`,
      title: t.title,
      body: `${t.workTypeLabel} · Due ${t.dueLabel}`,
      dueLabel: t.dueLabel,
      statusLabel: t.statusLabel,
      occurredAt: new Date().toISOString(),
      dtoSource: DTO_SOURCE,
    }));

  const fromActivities: PartnerCustomerFollowUpDto[] = activities
    .filter((a) => /follow|call|meeting/i.test(a.kindLabel) || /follow/i.test(a.title))
    .map((a) => ({
      followUpId: `fu-act-${a.activityId}`,
      title: a.title,
      body: a.body,
      dueLabel: "Logged",
      statusLabel: a.kindLabel,
      occurredAt: a.occurredAt,
      dtoSource: DTO_SOURCE,
    }));

  return [...fromTasks, ...fromActivities]
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
    .slice(0, 30);
}

function projectCommunications(
  history: { historyId: string; title: string; body: string; actorLabel: string; occurredAt: string }[],
  activities: { activityId: string; title: string; body: string; occurredAt: string; kindLabel: string }[],
): PartnerCustomerCommunicationDto[] {
  const fromHistory = history.map((h) => ({
    communicationId: h.historyId,
    channelLabel: "Enterprise",
    title: h.title,
    body: h.body,
    directionLabel: h.actorLabel,
    occurredAt: h.occurredAt,
    dtoSource: DTO_SOURCE,
  }));
  const fromActs = activities
    .filter((a) => /sms|email|whatsapp|call|message|communication/i.test(a.kindLabel))
    .map((a) => ({
      communicationId: a.activityId,
      channelLabel: a.kindLabel,
      title: a.title,
      body: a.body,
      directionLabel: "Logged",
      occurredAt: a.occurredAt,
      dtoSource: DTO_SOURCE,
    }));
  return [...fromHistory, ...fromActs]
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
    .slice(0, 40);
}

export async function loadEcmContactForPartner(
  customerId: string,
): Promise<EcmContact | null> {
  if (!customerId) return null;
  try {
    if (!isDatabaseAvailable()) return null;
    return await ecmContactRepository.findById(customerId);
  } catch {
    return null;
  }
}

export function composePartnerCustomerWorkspace(input: {
  customerId: string;
  fallback: PartnerCustomerSearchHitDto;
  ecm: EcmContact | null;
  opportunities: PartnerOpportunityDetailDto[];
  partnerDisplayLabel?: string;
}): PartnerCustomerWorkspaceDto {
  const { customerId, fallback, ecm, opportunities } = input;
  const partnerLabel = input.partnerDisplayLabel || "You";

  const activeOpps = opportunities.filter(
    (o) => !isPreviousLifecycle(o.lifecycleStatus, o.stageLabel),
  );
  const previousOpps = opportunities.filter((o) =>
    isPreviousLifecycle(o.lifecycleStatus, o.stageLabel),
  );

  const activeRows = activeOpps.map((o) => mapOpportunityRow(o, "active"));
  const previousRows = previousOpps.map((o) => mapOpportunityRow(o, "previous"));
  const allRows = [...activeRows, ...previousRows];

  const products = [
    ...new Set(opportunities.map((o) => o.productLabel).filter(Boolean)),
  ];
  const lastInteractionAt =
    opportunities
      .map((o) => o.updatedAt)
      .sort()
      .at(-1) ||
    ecm?.lastActiveOn ||
    ecm?.modifiedOn ||
    new Date().toISOString();

  const healthPercent = Math.max(
    12,
    Math.min(
      100,
      (ecm?.contactScore ?? 40) +
        Math.min(30, activeRows.length * 12) +
        Math.min(20, products.length * 8),
    ),
  );
  const healthLabel =
    healthPercent >= 80 ? "Strong" : healthPercent >= 50 ? "On track" : "Needs attention";

  const fromRegistry = Boolean(ecm);
  const summary = fromRegistry
    ? "Customer profile projected from the Enterprise Customer Registry. Related opportunities, documents, tasks, and communications are enterprise projections."
    : "Lightweight Customer Workspace. Profile will enrich from the Enterprise Customer Registry when this customer is linked in Catalyst One.";

  const profile = buildProfile({
    ecm,
    fallback,
    products,
    healthLabel,
    healthPercent,
    partnerLabel,
    summary,
  });
  const contactInformation = buildContactInfo(ecm, fallback);

  const uploadedDocuments: PartnerCustomerDocumentDto[] = opportunities.flatMap((o) =>
    (o.documents ?? []).map((d) => ({
      documentId: d.documentId,
      title: d.title,
      statusLabel: d.statusLabel,
      categoryLabel: d.categoryLabel || "Document",
      opportunityReference: o.reference,
      updatedAt: d.updatedAt,
      dtoSource: DTO_SOURCE,
    })),
  );

  const notes: PartnerCustomerNoteDto[] = opportunities.flatMap((o) =>
    (o.noteEntries ?? []).map((n) => ({
      noteId: n.noteId,
      body: n.body,
      authorLabel: n.authorLabel,
      occurredAt: n.occurredAt,
      dtoSource: DTO_SOURCE,
    })),
  );

  const activities = opportunities.flatMap((o) => o.activities ?? []);
  const history = opportunities.flatMap((o) => o.historyEntries ?? []);

  const tasks = projectTasks(customerId);
  const followUpTimeline = projectFollowUps(
    tasks,
    activities.map((a) => ({
      activityId: a.activityId,
      title: a.title,
      body: a.body,
      occurredAt: a.occurredAt,
      kindLabel: a.kindLabel,
    })),
  );
  const communicationHistory = projectCommunications(
    history.map((h) => ({
      historyId: h.historyId,
      title: h.title,
      body: h.body,
      actorLabel: h.actorLabel,
      occurredAt: h.occurredAt,
    })),
    activities.map((a) => ({
      activityId: a.activityId,
      title: a.title,
      body: a.body,
      occurredAt: a.occurredAt,
      kindLabel: a.kindLabel,
    })),
  );

  const firstActive = activeOpps[0];
  const nextBestAction = firstActive?.nextBestAction
    ? {
        title: firstActive.nextBestAction.title,
        reason: `Related to ${firstActive.reference}: ${firstActive.nextBestAction.reason}`,
        ctaLabel: "Open Opportunity",
        ctaDeepLink: `/app/opportunities/${firstActive.opportunityId}`,
        dtoSource: DTO_SOURCE,
      }
    : {
        title: "Start Opportunity",
        reason: "No active Opportunity in progress for this customer.",
        ctaLabel: "New Opportunity",
        ctaDeepLink: "/app/opportunities/new",
        dtoSource: DTO_SOURCE,
      };

  const upcoming =
    followUpTimeline[0]?.title ||
    tasks.find((t) => t.statusLabel === "Open")?.title ||
    "No follow-up scheduled";

  return {
    customerId,
    displayName: profile.displayName,
    mobile: contactInformation.mobilePrimary,
    customerTypeLabel: profile.customerTypeLabel,
    city: contactInformation.city,
    relationshipSinceLabel: profile.relationshipSinceLabel,
    activeOpportunityCount: activeRows.length,
    previousOpportunityCount: previousRows.length,
    relationshipHealthLabel: healthLabel,
    relationshipHealthPercent: healthPercent,
    lastInteractionAt,
    lastInteractionLabel: fromRegistry
      ? "Enterprise Customer Registry"
      : "Partner relationship projection",
    summary,
    productsAvailed: profile.productsAvailed,
    assignedWealthPartnerLabel: profile.assignedWealthPartnerLabel,
    upcomingFollowUpLabel: upcoming,
    nextBestAction,
    profile,
    contactInformation,
    activeOpportunities: activeRows,
    previousOpportunities: previousRows,
    uploadedDocuments,
    notes,
    tasks,
    followUpTimeline,
    communicationHistory,
    opportunities: allRows,
    documents: uploadedDocuments,
    communicationReservedMessage:
      communicationHistory.length === 0
        ? "No communication history yet. Enterprise Communication Hub messages will appear here when available."
        : "Communication history projected from enterprise activity.",
    fromEnterpriseCustomerRegistry: fromRegistry,
    dtoSource: DTO_SOURCE,
    dtoNotice:
      "Lightweight Customer Workspace. Customer identity from Enterprise Customer Registry when linked. Connect does not store a duplicate customer database.",
  };
}

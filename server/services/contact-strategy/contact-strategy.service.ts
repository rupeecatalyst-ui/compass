/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007
 * Server compose from ECM, Company links, Opportunity, Deal, EAR, ETE, relationship plans.
 */

import "server-only";

import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { userAdminService } from "@server/services/user-admin.service";
import { listEteTasks } from "@/lib/enterprise-task-engine";
import { composeContactStrategySnapshot } from "@/lib/contact-strategy/compose";
import type { CaseVisibilityActor } from "@/lib/enterprise-case-visibility";
import type {
  ContactStrategyFilters,
  ContactStrategyRelationshipPlan,
  ContactStrategySnapshot,
} from "@/types/contact-strategy";
import type { EnterpriseActivityEvent } from "@/types/enterprise-activity-registry";
import type { EteTask } from "@/types/enterprise-task-engine";

function num(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function isMissingRelation(err: unknown): boolean {
  const code = typeof err === "object" && err && "code" in err ? String((err as { code?: string }).code) : "";
  const message = err instanceof Error ? err.message : String(err);
  return code === "P2021" || /does not exist/i.test(message);
}

export async function loadContactStrategySnapshot(input: {
  actor: CaseVisibilityActor;
  filters?: ContactStrategyFilters;
}): Promise<ContactStrategySnapshot> {
  if (!isDatabaseAvailable()) {
    throw Object.assign(new Error("Contact Strategy requires enterprise persistence."), {
      statusCode: 503,
      code: "CONTACT_STRATEGY_UNAVAILABLE",
    });
  }

  const organizationId = await resolvePilotOrganizationId();
  if (!organizationId) {
    throw Object.assign(new Error("Organization context unavailable."), {
      statusCode: 503,
      code: "ORG_CONTEXT_UNAVAILABLE",
    });
  }

  const downlineUserIds = input.actor.userId
    ? await userAdminService.resolveDownlineUserIds(input.actor.userId)
    : [];

  const [contacts, links, companies, opportunities, deals, events, dealTasks] = await Promise.all([
    prisma.ecmContact.findMany({
      where: { organizationId, isDeleted: false, enabled: true },
      select: {
        id: true,
        name: true,
        primaryRole: true,
        ownerId: true,
        ownerName: true,
        contactScore: true,
        strategicContact: true,
      },
      take: 500,
    }),
    prisma.ecmCompanyContactLink.findMany({
      where: { organizationId, status: "active" },
      select: { contactId: true, companyId: true },
      take: 2000,
    }),
    prisma.ecmCompany.findMany({
      where: { organizationId, isDeleted: false },
      select: { id: true, companyName: true },
      take: 500,
    }),
    prisma.enterpriseOpportunity.findMany({
      where: { organizationId, archived: false, isDeleted: false },
      select: {
        id: true,
        opportunityNumber: true,
        primaryContactId: true,
        companyId: true,
        requestedAmount: true,
        primaryOwnerUserId: true,
        relationshipManagerUserId: true,
      },
      take: 800,
    }),
    prisma.enterpriseDeal.findMany({
      where: { organizationId, isDeleted: false, archived: false },
      select: {
        id: true,
        dealNumber: true,
        primaryContactId: true,
        opportunityId: true,
        requestedAmount: true,
        approvedAmount: true,
        fulfilledAmount: true,
        primaryOwnerUserId: true,
        relationshipManagerUserId: true,
      },
      take: 800,
    }),
    prisma.enterpriseActivityEvent.findMany({
      where: { organizationId },
      orderBy: { occurredAt: "desc" },
      take: 2000,
    }),
    prisma.enterpriseDealTask.findMany({
      where: { organizationId, isDeleted: false, status: "open" },
      select: { id: true, dealId: true, title: true, dueAt: true, status: true, assigneeUserId: true },
      take: 800,
    }),
  ]);

  const companyName = new Map(companies.map((c) => [c.id, c.companyName]));
  const companyByContact = new Map<string, { companyId: string; companyName: string | null }>();
  for (const link of links) {
    if (companyByContact.has(link.contactId)) continue;
    companyByContact.set(link.contactId, {
      companyId: link.companyId,
      companyName: companyName.get(link.companyId) ?? null,
    });
  }

  let plans: ContactStrategyRelationshipPlan[] = [];
  try {
    const planRows = await prisma.ecmContactRelationshipPlan.findMany({
      where: { organizationId },
    });
    plans = planRows.map((row) => ({
      contactId: row.contactId,
      objective: row.objective,
      cadence: row.cadence as ContactStrategyRelationshipPlan["cadence"],
      preferredChannel: row.preferredChannel as ContactStrategyRelationshipPlan["preferredChannel"],
      nextReviewAt: row.nextReviewAt?.toISOString() ?? null,
      assignedOwnerUserId: row.assignedOwnerUserId,
      assignedOwnerName: row.assignedOwnerName,
    }));
  } catch (err) {
    if (!isMissingRelation(err)) throw err;
  }

  const dealContact = new Map(deals.map((d) => [d.id, d.primaryContactId]));
  const eteFromDeals: EteTask[] = dealTasks.map((task) => ({
    id: task.id,
    taskType: "opportunity",
    assigneeRef: task.assigneeUserId ? `user:${task.assigneeUserId}` : "unassigned",
    predefinedDescription: "Custom",
    title: task.title,
    dueOn: task.dueAt?.toISOString(),
    contactId: dealContact.get(task.dealId) ?? undefined,
    dealId: task.dealId,
    coOwnerRefs: [],
    escalated: false,
    colourStatus: "blue",
    enabled: true,
    createdBy: "system",
    createdOn: new Date().toISOString(),
    modifiedBy: "system",
    modifiedOn: new Date().toISOString(),
    status: task.status === "open" ? "open" : "completed",
    workType: /meeting/i.test(task.title) ? "Reminder" : "Follow-up",
  }));

  const ear: EnterpriseActivityEvent[] = events.map((row) => ({
    id: row.id,
    organizationId: row.organizationId,
    eventKind: row.eventKind as EnterpriseActivityEvent["eventKind"],
    sourceSystem: row.sourceSystem,
    sourceEventId: row.sourceEventId,
    title: row.title,
    summary: row.summary,
    payload:
      row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : null,
    opportunityId: row.opportunityId,
    dealId: row.dealId,
    contactId: row.contactId,
    taskId: row.taskId,
    documentId: row.documentId,
    actorUserId: row.actorUserId,
    actorName: row.actorName,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }));

  return composeContactStrategySnapshot({
    actor: input.actor,
    downlineUserIds,
    contacts: contacts.map((c) => ({
      id: c.id,
      name: c.name,
      primaryRole: c.primaryRole,
      ownerId: c.ownerId,
      ownerName: c.ownerName,
      contactScore: c.contactScore,
      strategicContact: c.strategicContact,
      companyId: companyByContact.get(c.id)?.companyId ?? null,
      companyName: companyByContact.get(c.id)?.companyName ?? null,
    })),
    opportunities: opportunities.map((o) => ({
      id: o.id,
      opportunityNumber: o.opportunityNumber,
      primaryContactId: o.primaryContactId,
      companyId: o.companyId,
      requestedAmount: num(o.requestedAmount),
      primaryOwnerUserId: o.primaryOwnerUserId,
      assignedUserIds: [o.primaryOwnerUserId, o.relationshipManagerUserId].filter(
        (id): id is string => Boolean(id),
      ),
    })),
    deals: deals.map((d) => ({
      id: d.id,
      dealNumber: d.dealNumber,
      primaryContactId: d.primaryContactId,
      opportunityId: d.opportunityId,
      requestedAmount: num(d.requestedAmount),
      approvedAmount: num(d.approvedAmount),
      fulfilledAmount: num(d.fulfilledAmount),
      primaryOwnerUserId: d.primaryOwnerUserId,
      assignedUserIds: [d.primaryOwnerUserId, d.relationshipManagerUserId].filter(
        (id): id is string => Boolean(id),
      ),
    })),
    events: ear,
    tasks: [...listEteTasks(), ...eteFromDeals],
    plans,
    filters: input.filters,
  });
}

export async function upsertContactRelationshipPlan(input: {
  actorUserId: string;
  actorLabel: string;
  contactId: string;
  objective?: string | null;
  cadence?: string | null;
  preferredChannel?: string | null;
  nextReviewAt?: string | null;
  assignedOwnerUserId?: string | null;
  assignedOwnerName?: string | null;
}): Promise<ContactStrategyRelationshipPlan> {
  const organizationId = await resolvePilotOrganizationId();
  if (!organizationId) {
    throw Object.assign(new Error("Organization context unavailable."), {
      statusCode: 503,
      code: "ORG_CONTEXT_UNAVAILABLE",
    });
  }

  const contact = await prisma.ecmContact.findFirst({
    where: { id: input.contactId, organizationId, isDeleted: false },
    select: { id: true },
  });
  if (!contact) {
    throw Object.assign(new Error("Contact not found."), {
      statusCode: 404,
      code: "CONTACT_NOT_FOUND",
    });
  }

  try {
    const row = await prisma.ecmContactRelationshipPlan.upsert({
      where: { contactId: input.contactId },
      create: {
        organizationId,
        contactId: input.contactId,
        objective: input.objective?.trim() || null,
        cadence: input.cadence?.trim() || null,
        preferredChannel: input.preferredChannel?.trim() || null,
        nextReviewAt: input.nextReviewAt ? new Date(input.nextReviewAt) : null,
        assignedOwnerUserId: input.assignedOwnerUserId?.trim() || null,
        assignedOwnerName: input.assignedOwnerName?.trim() || null,
        updatedBy: input.actorUserId,
      },
      update: {
        objective: input.objective?.trim() || null,
        cadence: input.cadence?.trim() || null,
        preferredChannel: input.preferredChannel?.trim() || null,
        nextReviewAt: input.nextReviewAt ? new Date(input.nextReviewAt) : null,
        assignedOwnerUserId: input.assignedOwnerUserId?.trim() || null,
        assignedOwnerName: input.assignedOwnerName?.trim() || null,
        updatedBy: input.actorUserId,
      },
    });
    return {
      contactId: row.contactId,
      objective: row.objective,
      cadence: row.cadence as ContactStrategyRelationshipPlan["cadence"],
      preferredChannel: row.preferredChannel as ContactStrategyRelationshipPlan["preferredChannel"],
      nextReviewAt: row.nextReviewAt?.toISOString() ?? null,
      assignedOwnerUserId: row.assignedOwnerUserId,
      assignedOwnerName: row.assignedOwnerName ?? input.actorLabel,
    };
  } catch (err) {
    if (isMissingRelation(err)) {
      throw Object.assign(
        new Error("Relationship plan storage is prepared but not applied in this environment."),
        { statusCode: 503, code: "CONTACT_STRATEGY_PLAN_MIGRATION_PENDING" },
      );
    }
    throw err;
  }
}

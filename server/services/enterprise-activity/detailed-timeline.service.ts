/**
 * CO-C1-ACTIVITY-DIALOGUE-TIMELINE-010
 * Authorised EAR compose for the organisation-wide Activity & Dialogue timeline.
 * Filter, search, and permission run in SQL before pagination. No 200-event scan cap.
 * Read-only. Does not emit, mutate, or send communications.
 */
import "server-only";

import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { userAdminService } from "@server/services/user-admin.service";
import { enterpriseActivityService } from "@server/services/enterprise-activity/enterprise-activity.service";
import {
  enterpriseActivityRepository,
  sourceSystemsForWorkspaceLabel,
  type EarTimelineQuery,
} from "@server/repositories/enterprise-activity/enterprise-activity.repository";
import {
  ACTIVITY_DIALOGUE_TIMELINE_MAX_PAGE_SIZE,
  ACTIVITY_DIALOGUE_TIMELINE_PAGE_SIZE,
  DETAILED_TIMELINE_EXCLUDED_KINDS,
  DETAILED_TIMELINE_EXCLUDED_SOURCES,
} from "@/constants/activity-dialogue-timeline";
import {
  canExposeTimelineTechnicalDetails,
  composeDetailedTimelineRow,
  decodeTimelineCursor,
  dedupeEnterpriseActivityEvents,
  emptyDetailedTimelineCounts,
  emptyDetailedTimelineFilters,
  encodeTimelineCursor,
  isExcludedPrivateOrAdvisoryEvent,
} from "@/lib/enterprise-activity-registry/detailed-timeline";
import { hasOrgWideCaseVisibility } from "@/lib/enterprise-case-visibility";
import type {
  DetailedTimelineCounts,
  DetailedTimelineFilters,
  DetailedTimelineGraphContext,
  DetailedTimelinePage,
  DetailedTimelineRow,
} from "@/types/activity-dialogue-timeline";
import type { CaseVisibilityActor } from "@/lib/enterprise-case-visibility";
import type { EnterpriseActivityEvent } from "@/types/enterprise-activity-registry";

function decimalToNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function toDomain(row: {
  id: string;
  organizationId: string;
  eventKind: string;
  sourceSystem: string;
  sourceEventId: string | null;
  title: string;
  summary: string | null;
  payload: unknown;
  opportunityId: string | null;
  dealId: string | null;
  contactId: string | null;
  taskId: string | null;
  documentId: string | null;
  actorUserId: string | null;
  actorName: string | null;
  occurredAt: Date;
  createdAt: Date;
}): EnterpriseActivityEvent {
  return {
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
  };
}

async function loadGraph(
  organizationId: string,
  opportunityIds: string[],
  dealIds: string[],
): Promise<DetailedTimelineGraphContext[]> {
  const graph: DetailedTimelineGraphContext[] = [];
  const uniqueOpps = [...new Set(opportunityIds.filter(Boolean))];
  const uniqueDeals = [...new Set(dealIds.filter(Boolean))];

  if (uniqueDeals.length) {
    const deals = await prisma.enterpriseDeal.findMany({
      where: { id: { in: uniqueDeals }, organizationId },
      select: {
        id: true,
        organizationId: true,
        opportunityId: true,
        dealNumber: true,
        lenderId: true,
        primaryCounterpartyName: true,
        productLabel: true,
        requestedAmount: true,
        grossStage: true,
        archived: true,
        lifecycleStatus: true,
        primaryContactId: true,
        companyId: true,
        primaryContactName: true,
        primaryOwnerUserId: true,
        relationshipManagerUserId: true,
        relationshipManagerName: true,
      },
    });
    for (const deal of deals) {
      graph.push({
        opportunityId: deal.opportunityId || "",
        dealId: deal.id,
        dealNumber: deal.dealNumber,
        lenderId: deal.lenderId,
        lenderLabel: deal.primaryCounterpartyName,
        productLabel: deal.productLabel,
        loanAmount: decimalToNumber(deal.requestedAmount),
        currentStage: deal.grossStage,
        archived: deal.archived,
        completed: String(deal.lifecycleStatus || "").toLowerCase() === "completed",
        organizationId: deal.organizationId,
        contactId: deal.primaryContactId,
        companyId: deal.companyId,
        customerLabel: deal.primaryContactName,
        primaryOwnerUserId: deal.primaryOwnerUserId,
        relationshipManagerUserId: deal.relationshipManagerUserId,
        relationshipManagerName: deal.relationshipManagerName,
      });
    }
  }

  if (uniqueOpps.length) {
    const opps = await prisma.enterpriseOpportunity.findMany({
      where: { id: { in: uniqueOpps }, organizationId },
      select: {
        id: true,
        organizationId: true,
        opportunityNumber: true,
        productLabel: true,
        requestedAmount: true,
        requirementStage: true,
        archived: true,
        lifecycleStatus: true,
        primaryContactId: true,
        companyId: true,
        primaryContactName: true,
        companyName: true,
        primaryOwnerUserId: true,
        relationshipManagerUserId: true,
        relationshipManagerName: true,
      },
    });
    for (const opp of opps) {
      graph.push({
        opportunityId: opp.id,
        opportunityNumber: opp.opportunityNumber,
        productLabel: opp.productLabel,
        loanAmount: decimalToNumber(opp.requestedAmount),
        currentStage: opp.requirementStage,
        archived: opp.archived,
        completed: ["won", "lost", "closed"].includes(String(opp.lifecycleStatus || "").toLowerCase()),
        organizationId: opp.organizationId,
        contactId: opp.primaryContactId,
        companyId: opp.companyId,
        customerLabel: opp.primaryContactName,
        companyLabel: opp.companyName,
        primaryOwnerUserId: opp.primaryOwnerUserId,
        relationshipManagerUserId: opp.relationshipManagerUserId,
        relationshipManagerName: opp.relationshipManagerName,
      });
    }
  }

  return graph;
}

async function loadVisibility(
  organizationId: string,
  actor: CaseVisibilityActor,
  downlineUserIds: string[],
): Promise<EarTimelineQuery["visibility"]> {
  if (hasOrgWideCaseVisibility(actor.role)) return { mode: "org" };
  const actorUserIds = [...new Set([...downlineUserIds, actor.userId || ""].filter(Boolean))];
  if (!actorUserIds.length) {
    return { mode: "scoped", actorUserIds: [], opportunityIds: [], dealIds: [] };
  }
  const [opps, deals] = await Promise.all([
    prisma.enterpriseOpportunity.findMany({
      where: {
        organizationId,
        OR: [
          { primaryOwnerUserId: { in: actorUserIds } },
          { relationshipManagerUserId: { in: actorUserIds } },
        ],
      },
      select: { id: true },
    }),
    prisma.enterpriseDeal.findMany({
      where: {
        organizationId,
        isDeleted: false,
        OR: [
          { primaryOwnerUserId: { in: actorUserIds } },
          { relationshipManagerUserId: { in: actorUserIds } },
        ],
      },
      select: { id: true },
    }),
  ]);
  return {
    mode: "scoped",
    actorUserIds,
    opportunityIds: opps.map((row) => row.id),
    dealIds: deals.map((row) => row.id),
  };
}

async function resolveCompanyScope(organizationId: string, companyId: string) {
  const [links, opps, deals] = await Promise.all([
    prisma.ecmCompanyContactLink.findMany({
      where: { organizationId, companyId, status: "active" },
      select: { contactId: true },
    }),
    prisma.enterpriseOpportunity.findMany({
      where: { organizationId, companyId },
      select: { id: true, primaryContactId: true },
    }),
    prisma.enterpriseDeal.findMany({
      where: { organizationId, companyId, isDeleted: false },
      select: { id: true, primaryContactId: true },
    }),
  ]);
  return {
    contactIds: [
      ...new Set(
        [
          ...links.map((row) => row.contactId),
          ...opps.map((row) => row.primaryContactId || ""),
          ...deals.map((row) => row.primaryContactId || ""),
        ].filter(Boolean),
      ),
    ],
    opportunityIds: opps.map((row) => row.id),
    dealIds: deals.map((row) => row.id),
  };
}

async function resolveLenderScope(organizationId: string, lenderId: string) {
  const deals = await prisma.enterpriseDeal.findMany({
    where: { organizationId, lenderId, isDeleted: false },
    select: { id: true, opportunityId: true },
  });
  return {
    dealIds: deals.map((row) => row.id),
    opportunityIds: [...new Set(deals.map((row) => row.opportunityId).filter((id): id is string => Boolean(id)))],
  };
}

async function resolveProductScope(organizationId: string, product: string) {
  const q = product.trim();
  const [opps, deals] = await Promise.all([
    prisma.enterpriseOpportunity.findMany({
      where: { organizationId, productLabel: { contains: q, mode: "insensitive" } },
      select: { id: true },
    }),
    prisma.enterpriseDeal.findMany({
      where: { organizationId, isDeleted: false, productLabel: { contains: q, mode: "insensitive" } },
      select: { id: true },
    }),
  ]);
  return {
    opportunityIds: opps.map((row) => row.id),
    dealIds: deals.map((row) => row.id),
  };
}

async function expandSearchEntityIds(organizationId: string, search: string) {
  const q = search.trim();
  if (!q) {
    return { opportunityIds: [] as string[], dealIds: [] as string[], contactIds: [] as string[] };
  }
  const [opps, deals, contacts] = await Promise.all([
    prisma.enterpriseOpportunity.findMany({
      where: {
        organizationId,
        OR: [
          { opportunityNumber: { contains: q, mode: "insensitive" } },
          { primaryContactName: { contains: q, mode: "insensitive" } },
          { companyName: { contains: q, mode: "insensitive" } },
          { productLabel: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true },
      take: 500,
    }),
    prisma.enterpriseDeal.findMany({
      where: {
        organizationId,
        isDeleted: false,
        OR: [
          { dealNumber: { contains: q, mode: "insensitive" } },
          { primaryContactName: { contains: q, mode: "insensitive" } },
          { primaryCounterpartyName: { contains: q, mode: "insensitive" } },
          { productLabel: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true },
      take: 500,
    }),
    prisma.ecmContact.findMany({
      where: {
        organizationId,
        isDeleted: false,
        name: { contains: q, mode: "insensitive" },
      },
      select: { id: true },
      take: 200,
    }),
  ]);
  return {
    opportunityIds: opps.map((row) => row.id),
    dealIds: deals.map((row) => row.id),
    contactIds: contacts.map((row) => row.id),
  };
}

function emptyPage(complete: boolean): DetailedTimelinePage & {
  counts: DetailedTimelineCounts;
  nextCursor: string | null;
  hasMore: boolean;
  durable: boolean;
  permissionDenied: boolean;
} {
  const summary = emptyDetailedTimelineCounts(complete);
  return {
    items: [],
    pageInfo: { nextCursor: null, hasNextPage: false },
    summary,
    counts: summary,
    nextCursor: null,
    hasMore: false,
    durable: complete,
    permissionDenied: false,
  };
}

function withoutCursor(query: EarTimelineQuery): EarTimelineQuery {
  return {
    ...query,
    cursorOccurredAt: undefined,
    cursorId: undefined,
    take: undefined,
  };
}

export async function listDetailedActivityDialogueTimeline(input: {
  actor: CaseVisibilityActor;
  filters?: DetailedTimelineFilters;
  cursor?: string | null;
  pageSize?: number;
}): Promise<
  DetailedTimelinePage & {
    counts: DetailedTimelineCounts;
    nextCursor: string | null;
    hasMore: boolean;
    durable: boolean;
    permissionDenied: boolean;
  }
> {
  const filters = input.filters ?? emptyDetailedTimelineFilters();
  const pageSize = Math.min(
    Math.max(input.pageSize ?? ACTIVITY_DIALOGUE_TIMELINE_PAGE_SIZE, 1),
    ACTIVITY_DIALOGUE_TIMELINE_MAX_PAGE_SIZE,
  );
  const includeTechnical = canExposeTimelineTechnicalDetails(input.actor.role);

  if (!enterpriseActivityService.isDurable() || !isDatabaseAvailable()) {
    return emptyPage(false);
  }

  const organizationId = await resolvePilotOrganizationId();
  const decoded = decodeTimelineCursor(input.cursor);
  const downlineUserIds = input.actor.userId
    ? await userAdminService.resolveDownlineUserIds(input.actor.userId)
    : [];

  const visibility = await loadVisibility(organizationId, input.actor, downlineUserIds);

  let entityScope: EarTimelineQuery["entityScope"];
  let emptyEntityScope = false;

  if (filters.companyId) {
    const company = await resolveCompanyScope(organizationId, filters.companyId);
    entityScope = {
      contactIds: company.contactIds,
      opportunityIds: company.opportunityIds,
      dealIds: company.dealIds,
    };
    if (!company.contactIds.length && !company.opportunityIds.length && !company.dealIds.length) {
      emptyEntityScope = true;
    }
  }
  if (filters.lenderId) {
    const lender = await resolveLenderScope(organizationId, filters.lenderId);
    entityScope = {
      opportunityIds: entityScope?.opportunityIds
        ? entityScope.opportunityIds.filter((id) => lender.opportunityIds.includes(id))
        : lender.opportunityIds,
      dealIds: entityScope?.dealIds
        ? entityScope.dealIds.filter((id) => lender.dealIds.includes(id))
        : lender.dealIds,
      contactIds: entityScope?.contactIds,
    };
    if (!lender.dealIds.length) emptyEntityScope = true;
  }
  if (filters.product) {
    const product = await resolveProductScope(organizationId, filters.product);
    entityScope = {
      opportunityIds: entityScope?.opportunityIds
        ? entityScope.opportunityIds.filter((id) => product.opportunityIds.includes(id))
        : product.opportunityIds,
      dealIds: entityScope?.dealIds
        ? entityScope.dealIds.filter((id) => product.dealIds.includes(id))
        : product.dealIds,
      contactIds: entityScope?.contactIds,
    };
    if (!product.opportunityIds.length && !product.dealIds.length) emptyEntityScope = true;
  }
  if (entityScope && (filters.lenderId || filters.product)) {
    entityScope = { ...entityScope, contactIds: undefined };
  }

  if (emptyEntityScope) {
    return { ...emptyPage(true), durable: true };
  }

  const searchIds = await expandSearchEntityIds(organizationId, filters.search || "");
  const sourceSystems = filters.sourceWorkspace
    ? sourceSystemsForWorkspaceLabel(filters.sourceWorkspace)
    : undefined;

  const query: EarTimelineQuery = {
    organizationId,
    take: pageSize + 1,
    since: filters.since ? new Date(filters.since) : undefined,
    until: filters.until ? new Date(filters.until) : undefined,
    cursorOccurredAt: decoded ? new Date(decoded.occurredAt) : undefined,
    cursorId: decoded?.id,
    opportunityId: filters.opportunityId || undefined,
    dealId: filters.dealId || undefined,
    contactId: filters.contactId || undefined,
    actorUserId: filters.actorUserId || undefined,
    search: filters.search || undefined,
    searchOpportunityIds: searchIds.opportunityIds,
    searchDealIds: searchIds.dealIds,
    searchContactIds: searchIds.contactIds,
    excludeSourceSystems: [...DETAILED_TIMELINE_EXCLUDED_SOURCES],
    excludeEventKinds: [...DETAILED_TIMELINE_EXCLUDED_KINDS],
    eventType: filters.eventType,
    sourceSystems,
    status: filters.status,
    visibility,
    entityScope,
  };

  const countQuery = withoutCursor(query);
  const [raw, total, communications, stageChanges, documents, tasks, needsAttention] =
    await Promise.all([
      enterpriseActivityRepository.listTimelinePage(query),
      enterpriseActivityRepository.countTimeline(countQuery),
      enterpriseActivityRepository.countTimeline({ ...countQuery, eventType: "communications" }),
      enterpriseActivityRepository.countTimeline({ ...countQuery, eventType: "stage_changes" }),
      enterpriseActivityRepository.countTimeline({ ...countQuery, eventType: "documents" }),
      enterpriseActivityRepository.countTimeline({ ...countQuery, eventType: "tasks" }),
      enterpriseActivityRepository.countTimeline({ ...countQuery, status: "needs_attention" }),
    ]);

  const hasNextPage = raw.length > pageSize;
  const pageRows = raw.slice(0, pageSize);
  const events = dedupeEnterpriseActivityEvents(pageRows.map(toDomain)).filter(
    (event) => !isExcludedPrivateOrAdvisoryEvent(event),
  );
  const graph = await loadGraph(
    organizationId,
    events.map((event) => event.opportunityId || ""),
    events.map((event) => event.dealId || ""),
  );
  const items: DetailedTimelineRow[] = events.map((event) =>
    composeDetailedTimelineRow(event, {
      graph,
      actorRole: input.actor.role,
      includeTechnical,
    }),
  );

  const last = items[items.length - 1];
  const nextCursor = hasNextPage && last ? encodeTimelineCursor(last) : null;
  const summary: DetailedTimelineCounts = {
    total,
    communications,
    stageChanges,
    documents,
    tasks,
    needsAttention,
    capped: false,
    complete: true,
  };

  return {
    items,
    pageInfo: { nextCursor, hasNextPage },
    summary,
    counts: summary,
    nextCursor,
    hasMore: hasNextPage,
    durable: true,
    permissionDenied: false,
  };
}

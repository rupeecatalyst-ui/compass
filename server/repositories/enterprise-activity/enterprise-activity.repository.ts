/**
 * CO-ORG-003 — Enterprise Activity Registry repository.
 */
import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import { DETAILED_TIMELINE_SOURCE_WORKSPACE } from "@/constants/activity-dialogue-timeline";
import type {
  DetailedTimelineEventType,
  DetailedTimelineStatusFilter,
} from "@/types/activity-dialogue-timeline";

export type EarCreateInput = {
  id?: string;
  organizationId: string;
  eventKind: string;
  sourceSystem: string;
  sourceEventId: string;
  title: string;
  summary?: string | null;
  payload?: Prisma.InputJsonValue;
  opportunityId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  taskId?: string | null;
  documentId?: string | null;
  actorUserId?: string | null;
  actorName?: string | null;
  occurredAt: Date;
};

export type EarListFilter = {
  organizationId: string;
  limit?: number;
  eventKind?: string;
  opportunityId?: string;
  dealId?: string;
  contactId?: string;
  sourceSystem?: string;
  actorUserId?: string;
  since?: Date;
  until?: Date;
  cursorOccurredAt?: Date;
  cursorId?: string;
  excludeSourceSystems?: string[];
  excludeEventKinds?: string[];
};

export type EarTimelineVisibility =
  | { mode: "org" }
  | {
      mode: "scoped";
      actorUserIds: string[];
      opportunityIds: string[];
      dealIds: string[];
    };

export type EarTimelineQuery = {
  organizationId: string;
  take?: number;
  since?: Date;
  until?: Date;
  cursorOccurredAt?: Date;
  cursorId?: string;
  opportunityId?: string;
  dealId?: string;
  contactId?: string;
  actorUserId?: string;
  search?: string;
  searchOpportunityIds?: string[];
  searchDealIds?: string[];
  searchContactIds?: string[];
  excludeSourceSystems?: string[];
  excludeEventKinds?: string[];
  eventType?: DetailedTimelineEventType | "all";
  sourceSystems?: string[];
  status?: DetailedTimelineStatusFilter;
  visibility?: EarTimelineVisibility;
  scopedOpportunityIds?: string[];
  scopedDealIds?: string[];
  scopedContactIds?: string[];
  /**
   * Company / lender / product resolution. Matched as OR across linked ids
   * (an event may carry only a Deal, only an Opportunity, or only a Contact).
   */
  entityScope?: {
    opportunityIds?: string[];
    dealIds?: string[];
    contactIds?: string[];
  };
};

function nonempty(ids?: string[]): string[] {
  return [...new Set((ids || []).map((id) => id.trim()).filter(Boolean))];
}

function payloadContains(path: string[], needle: string): Prisma.EnterpriseActivityEventWhereInput {
  return {
    payload: {
      path,
      string_contains: needle,
    },
  };
}

function payloadEquals(path: string[], value: Prisma.InputJsonValue): Prisma.EnterpriseActivityEventWhereInput {
  return {
    payload: {
      path,
      equals: value,
    },
  };
}

function payloadPathPresent(path: string[]): Prisma.EnterpriseActivityEventWhereInput {
  return {
    payload: {
      path,
      not: Prisma.JsonNull,
    },
  };
}

export function timelineEventTypeWhere(
  eventType: DetailedTimelineEventType | "all" | undefined,
): Prisma.EnterpriseActivityEventWhereInput | null {
  if (!eventType || eventType === "all") return null;

  const communications: Prisma.EnterpriseActivityEventWhereInput = {
    OR: [
      { eventKind: "communications" },
      { sourceSystem: { in: ["inbound_email", "outbox", "ecie", "ence"] } },
    ],
  };
  const notes: Prisma.EnterpriseActivityEventWhereInput = {
    OR: [{ eventKind: "notes" }, { sourceSystem: "business_notes" }],
  };
  const documents: Prisma.EnterpriseActivityEventWhereInput = {
    OR: [
      { eventKind: "documents" },
      { sourceSystem: { in: ["document", "document_request", "customer_portal", "document_workspace"] } },
    ],
  };
  const tasks: Prisma.EnterpriseActivityEventWhereInput = {
    OR: [{ eventKind: "tasks" }, { sourceSystem: { in: ["ete", "tasks"] } }],
  };
  const stageChanges: Prisma.EnterpriseActivityEventWhereInput = {
    OR: [
      { eventKind: "stage_change" },
      { title: { contains: "stage changed", mode: "insensitive" } },
      payloadPathPresent(["previousStage"]),
      payloadPathPresent(["newStage"]),
      payloadPathPresent(["fromGrossStage"]),
      payloadPathPresent(["toGrossStage"]),
    ],
  };
  const assignment: Prisma.EnterpriseActivityEventWhereInput = {
    OR: [
      { title: { contains: "assign", mode: "insensitive" } },
      { title: { contains: "reassign", mode: "insensitive" } },
      { summary: { contains: "assign", mode: "insensitive" } },
      payloadPathPresent(["assignmentField"]),
      payloadPathPresent(["previousOwner"]),
      payloadPathPresent(["newOwner"]),
      payloadPathPresent(["fromEmployee"]),
      payloadPathPresent(["toEmployee"]),
    ],
  };
  const accounting: Prisma.EnterpriseActivityEventWhereInput = {
    OR: [
      { sourceSystem: "accounting" },
      { eventKind: { contains: "accounting", mode: "insensitive" } },
      { title: { contains: "accounting case", mode: "insensitive" } },
    ],
  };
  const activities: Prisma.EnterpriseActivityEventWhereInput = {
    OR: [
      { eventKind: { in: ["dialogue", "opportunity"] } },
      { sourceSystem: "deal_activity" },
    ],
  };

  const typed: Record<Exclude<DetailedTimelineEventType, never>, Prisma.EnterpriseActivityEventWhereInput> = {
    communications,
    notes,
    documents,
    tasks,
    stage_changes: stageChanges,
    assignment_changes: assignment,
    accounting,
    activities,
    system_events: {
      NOT: {
        OR: [
          communications,
          notes,
          documents,
          tasks,
          stageChanges,
          assignment,
          accounting,
          activities,
        ],
      },
    },
  };
  return typed[eventType] ?? null;
}

function timelineStatusWhere(
  status: DetailedTimelineStatusFilter | undefined,
): Prisma.EnterpriseActivityEventWhereInput | null {
  if (!status || status === "all") return null;
  if (status === "needs_attention") {
    return {
      OR: [
        payloadEquals(["needsAttention"], true),
        payloadContains(["matchStatus"], "needs_review"),
        payloadContains(["matchStatus"], "unmatched"),
        payloadContains(["matchStatus"], "received"),
        payloadContains(["status"], "pending_review"),
        payloadContains(["status"], "failed"),
        payloadContains(["deliveryStatus"], "fail"),
        payloadContains(["reviewStatus"], "review"),
      ],
    };
  }
  const needles: Record<Exclude<DetailedTimelineStatusFilter, "all" | "needs_attention">, string[]> = {
    queued: ["queue"],
    delivered: ["deliver"],
    completed: ["complete"],
    pending_review: ["review", "pending", "await"],
    failed: ["fail"],
  };
  const terms = needles[status] ?? [];
  return {
    OR: terms.flatMap((term) => [
      payloadContains(["deliveryStatus"], term),
      payloadContains(["statusLabel"], term),
      payloadContains(["status"], term),
      payloadContains(["matchStatus"], term),
      payloadContains(["reviewStatus"], term),
    ]),
  };
}

export function sourceSystemsForWorkspaceLabel(label: string): string[] {
  const lower = label.trim().toLowerCase();
  if (!lower) return [];
  const keys = Object.entries(DETAILED_TIMELINE_SOURCE_WORKSPACE)
    .filter(([code, heading]) => code === lower || heading.toLowerCase() === lower)
    .map(([code]) => code);
  return keys.length ? keys : [label.trim()];
}

function buildTimelineWhere(filter: EarTimelineQuery): Prisma.EnterpriseActivityEventWhereInput {
  const AND: Prisma.EnterpriseActivityEventWhereInput[] = [];
  const where: Prisma.EnterpriseActivityEventWhereInput = {
    organizationId: filter.organizationId,
  };

  if (filter.opportunityId) where.opportunityId = filter.opportunityId;
  if (filter.dealId) where.dealId = filter.dealId;
  if (filter.contactId) where.contactId = filter.contactId;
  if (filter.actorUserId) where.actorUserId = filter.actorUserId;

  const scopedOpps = nonempty(filter.scopedOpportunityIds);
  const scopedDeals = nonempty(filter.scopedDealIds);
  const scopedContacts = nonempty(filter.scopedContactIds);
  const entityOpps = nonempty(filter.entityScope?.opportunityIds);
  const entityDeals = nonempty(filter.entityScope?.dealIds);
  const entityContacts = nonempty(filter.entityScope?.contactIds);
  const entityOr: Prisma.EnterpriseActivityEventWhereInput[] = [];
  if (entityOpps.length) entityOr.push({ opportunityId: { in: entityOpps } });
  if (entityDeals.length) entityOr.push({ dealId: { in: entityDeals } });
  if (entityContacts.length) entityOr.push({ contactId: { in: entityContacts } });
  if (entityOr.length) AND.push({ OR: entityOr });
  if (scopedOpps.length) AND.push({ opportunityId: { in: scopedOpps } });
  if (scopedDeals.length) AND.push({ dealId: { in: scopedDeals } });
  if (scopedContacts.length) AND.push({ contactId: { in: scopedContacts } });

  if (filter.excludeSourceSystems?.length) {
    where.sourceSystem = { notIn: filter.excludeSourceSystems };
  }
  if (filter.excludeEventKinds?.length) {
    where.eventKind = { notIn: filter.excludeEventKinds };
  }
  if (filter.sourceSystems?.length) {
    AND.push({ sourceSystem: { in: filter.sourceSystems } });
  }

  const occurred: Prisma.DateTimeFilter = {};
  if (filter.since) occurred.gte = filter.since;
  if (filter.until) occurred.lte = filter.until;
  if (Object.keys(occurred).length) where.occurredAt = occurred;

  if (filter.cursorOccurredAt) {
    AND.push({
      OR: [
        { occurredAt: { lt: filter.cursorOccurredAt } },
        {
          AND: [
            { occurredAt: filter.cursorOccurredAt },
            { id: { lt: filter.cursorId || "" } },
          ],
        },
      ],
    });
  }

  AND.push({ title: { not: "" } });
  AND.push({
    NOT: {
      OR: [
        { title: { contains: "hydrate", mode: "insensitive" } },
        { title: { contains: "heartbeat", mode: "insensitive" } },
        { title: { contains: "telemetry", mode: "insensitive" } },
        { title: { contains: "radar vector", mode: "insensitive" } },
        { title: { contains: "ops pulse", mode: "insensitive" } },
        { title: { contains: "chanakya chat", mode: "insensitive" } },
        { title: { contains: "chanakya conversation", mode: "insensitive" } },
        { title: { contains: "chanakya session", mode: "insensitive" } },
      ],
    },
  });

  const eventTypeWhere = timelineEventTypeWhere(filter.eventType);
  if (eventTypeWhere) AND.push(eventTypeWhere);
  const statusWhere = timelineStatusWhere(filter.status);
  if (statusWhere) AND.push(statusWhere);

  const q = (filter.search || "").trim();
  if (q) {
    const searchOr: Prisma.EnterpriseActivityEventWhereInput[] = [
      { title: { contains: q, mode: "insensitive" } },
      { summary: { contains: q, mode: "insensitive" } },
      { id: { contains: q, mode: "insensitive" } },
      { opportunityId: { contains: q, mode: "insensitive" } },
      { dealId: { contains: q, mode: "insensitive" } },
      { contactId: { contains: q, mode: "insensitive" } },
      { actorName: { contains: q, mode: "insensitive" } },
    ];
    const searchOpps = nonempty(filter.searchOpportunityIds);
    const searchDeals = nonempty(filter.searchDealIds);
    const searchContacts = nonempty(filter.searchContactIds);
    if (searchOpps.length) searchOr.push({ opportunityId: { in: searchOpps } });
    if (searchDeals.length) searchOr.push({ dealId: { in: searchDeals } });
    if (searchContacts.length) searchOr.push({ contactId: { in: searchContacts } });
    AND.push({ OR: searchOr });
  }

  if (filter.visibility && filter.visibility.mode === "scoped") {
    const visOr: Prisma.EnterpriseActivityEventWhereInput[] = [];
    const actorIds = nonempty(filter.visibility.actorUserIds);
    const visOpps = nonempty(filter.visibility.opportunityIds);
    const visDeals = nonempty(filter.visibility.dealIds);
    if (actorIds.length) visOr.push({ actorUserId: { in: actorIds } });
    if (visOpps.length) visOr.push({ opportunityId: { in: visOpps } });
    if (visDeals.length) visOr.push({ dealId: { in: visDeals } });
    AND.push(
      visOr.length ? { OR: visOr } : { id: "__no_visible_timeline_scope__" },
    );
  }

  if (AND.length) where.AND = AND;
  return where;
}

export const enterpriseActivityRepository = {
  async upsertEvent(input: EarCreateInput) {
    return prisma.enterpriseActivityEvent.upsert({
      where: {
        organizationId_sourceSystem_sourceEventId: {
          organizationId: input.organizationId,
          sourceSystem: input.sourceSystem,
          sourceEventId: input.sourceEventId,
        },
      },
      create: {
        id: input.id,
        organizationId: input.organizationId,
        eventKind: input.eventKind,
        sourceSystem: input.sourceSystem,
        sourceEventId: input.sourceEventId,
        title: input.title,
        summary: input.summary ?? null,
        payload: input.payload ?? undefined,
        opportunityId: input.opportunityId ?? null,
        dealId: input.dealId ?? null,
        contactId: input.contactId ?? null,
        taskId: input.taskId ?? null,
        documentId: input.documentId ?? null,
        actorUserId: input.actorUserId ?? null,
        actorName: input.actorName ?? null,
        occurredAt: input.occurredAt,
      },
      update: {
        title: input.title,
        summary: input.summary ?? null,
        payload: input.payload ?? undefined,
        opportunityId: input.opportunityId ?? null,
        dealId: input.dealId ?? null,
        contactId: input.contactId ?? null,
        taskId: input.taskId ?? null,
        documentId: input.documentId ?? null,
        actorUserId: input.actorUserId ?? null,
        actorName: input.actorName ?? null,
        occurredAt: input.occurredAt,
        eventKind: input.eventKind,
      },
    });
  },

  async list(filter: EarListFilter) {
    const where: Prisma.EnterpriseActivityEventWhereInput = {
      organizationId: filter.organizationId,
    };
    if (filter.eventKind) where.eventKind = filter.eventKind;
    if (filter.opportunityId) where.opportunityId = filter.opportunityId;
    if (filter.dealId) where.dealId = filter.dealId;
    if (filter.contactId) where.contactId = filter.contactId;
    if (filter.sourceSystem) where.sourceSystem = filter.sourceSystem;
    if (filter.actorUserId) where.actorUserId = filter.actorUserId;
    if (filter.excludeSourceSystems?.length) {
      where.sourceSystem = filter.sourceSystem
        ? filter.sourceSystem
        : { notIn: filter.excludeSourceSystems };
    }
    if (filter.excludeEventKinds?.length) {
      where.eventKind = filter.eventKind
        ? filter.eventKind
        : { notIn: filter.excludeEventKinds };
    }

    const occurred: Prisma.DateTimeFilter = {};
    if (filter.since) occurred.gte = filter.since;
    if (filter.until) occurred.lte = filter.until;
    if (filter.cursorOccurredAt) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { occurredAt: { lt: filter.cursorOccurredAt } },
            {
              AND: [
                { occurredAt: filter.cursorOccurredAt },
                { id: { lt: filter.cursorId || "" } },
              ],
            },
          ],
        },
      ];
    }
    if (Object.keys(occurred).length) {
      where.occurredAt = occurred;
    }

    return prisma.enterpriseActivityEvent.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: Math.min(Math.max(filter.limit ?? 50, 1), 200),
    });
  },

  /**
   * Organisation-wide timeline page. Filter/search/visibility applied in SQL
   * before take. No organisation-wide scan cap.
   */
  async listTimelinePage(filter: EarTimelineQuery) {
    const take = Math.min(Math.max(filter.take ?? 41, 1), 101);
    return prisma.enterpriseActivityEvent.findMany({
      where: buildTimelineWhere(filter),
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take,
    });
  },

  async countTimeline(filter: EarTimelineQuery) {
    return prisma.enterpriseActivityEvent.count({
      where: buildTimelineWhere({
        ...filter,
        cursorOccurredAt: undefined,
        cursorId: undefined,
        take: undefined,
      }),
    });
  },
};

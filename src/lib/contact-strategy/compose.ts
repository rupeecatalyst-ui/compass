/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007
 * Compose Contact Strategy rows from canonical registries. No mock arrays.
 */

import { deriveContact360BusinessValue } from "@/lib/enterprise-contact-master/contact-360-relationship-graph";
import {
  classifyMeaningfulInteractionChannel,
  isMeaningfulRelationshipInteraction,
  latestMeaningfulInteraction,
} from "@/lib/relationship-heat-map/meaningful-interaction";
import type { CaseVisibilityActor } from "@/lib/enterprise-case-visibility";
import type { EnterpriseActivityEvent } from "@/types/enterprise-activity-registry";
import type { EteTask } from "@/types/enterprise-task-engine";
import {
  CONTACT_STRATEGY_SPRINT,
  type ContactStrategyActivityBand,
  type ContactStrategyCadence,
  type ContactStrategyFilters,
  type ContactStrategyKpis,
  type ContactStrategyPreferredChannel,
  type ContactStrategyRelationshipPlan,
  type ContactStrategyRow,
  type ContactStrategySnapshot,
} from "@/types/contact-strategy";
import {
  activityBandFromLastMeaningfulAt,
  daysSinceIsoAt,
  isDueToday,
  isOverdue,
  isUpcoming,
} from "./activity-band";
import { contactStrategyActorMaySee } from "./visibility";
import { stickyNoteMustNotEnterSharedActivity } from "@/lib/sticky-notes/owner-scope";
import { assertNoContactStrategyPii } from "./redact";

export type ContactStrategyComposeContact = {
  id: string;
  name: string;
  primaryRole?: string | null;
  ownerId?: string | null;
  ownerName?: string | null;
  contactScore?: number | null;
  strategicContact?: boolean | null;
  companyId?: string | null;
  companyName?: string | null;
};

export type ContactStrategyComposeOpportunity = {
  id: string;
  opportunityNumber?: string | null;
  primaryContactId?: string | null;
  companyId?: string | null;
  requestedAmount?: number | null;
  assignedUserIds?: string[] | null;
  primaryOwnerUserId?: string | null;
};

export type ContactStrategyComposeDeal = {
  id: string;
  dealNumber?: string | null;
  primaryContactId?: string | null;
  opportunityId?: string | null;
  requestedAmount?: number | null;
  approvedAmount?: number | null;
  fulfilledAmount?: number | null;
  assignedUserIds?: string[] | null;
  primaryOwnerUserId?: string | null;
};

export type ContactStrategyComposeInput = {
  actor: CaseVisibilityActor;
  downlineUserIds?: string[] | null;
  contacts: ContactStrategyComposeContact[];
  opportunities: ContactStrategyComposeOpportunity[];
  deals: ContactStrategyComposeDeal[];
  events: EnterpriseActivityEvent[];
  tasks: EteTask[];
  plans?: ContactStrategyRelationshipPlan[];
  filters?: ContactStrategyFilters;
  nowMs?: number;
};

const CHANNELS = new Set(["call", "email", "whatsapp", "meeting"]);
const CADENCES = new Set(["weekly", "fortnightly", "monthly", "quarterly", "as_needed"]);

function asChannel(value: string | null | undefined): ContactStrategyPreferredChannel | null {
  const v = value?.trim().toLowerCase() || "";
  return CHANNELS.has(v) ? (v as ContactStrategyPreferredChannel) : null;
}

function asCadence(value: string | null | undefined): ContactStrategyCadence | null {
  const v = value?.trim().toLowerCase() || "";
  return CADENCES.has(v) ? (v as ContactStrategyCadence) : null;
}

function roleLabel(role: string | null | undefined): string {
  if (!role?.trim()) return "Contact";
  return role.replace(/_/g, " ");
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isOpenTask(task: EteTask): boolean {
  return task.enabled !== false && (task.status ?? "open") === "open";
}

function isMeetingTask(task: EteTask): boolean {
  const hay = `${task.title || ""} ${task.predefinedDescription || ""} ${task.workType || ""}`.toLowerCase();
  return hay.includes("meeting") || hay.includes("branch visit");
}

function pickLinkedOpportunity(
  contactId: string,
  companyId: string | null,
  opportunities: ContactStrategyComposeOpportunity[],
): ContactStrategyComposeOpportunity | null {
  const primary = opportunities.filter((o) => o.primaryContactId === contactId);
  if (primary[0]) return primary[0];
  if (companyId) {
    const byCompany = opportunities.filter((o) => o.companyId === companyId);
    if (byCompany[0]) return byCompany[0];
  }
  return null;
}

function pickLinkedDeal(
  contactId: string,
  opportunityId: string | null,
  deals: ContactStrategyComposeDeal[],
): ContactStrategyComposeDeal | null {
  const primary = deals.filter((d) => d.primaryContactId === contactId);
  if (primary[0]) return primary[0];
  if (opportunityId) {
    const byOpp = deals.filter((d) => d.opportunityId === opportunityId);
    if (byOpp[0]) return byOpp[0];
  }
  return null;
}

function pickNextAction(
  contactId: string,
  plan: ContactStrategyRelationshipPlan | undefined,
  tasks: EteTask[],
  nowMs: number,
): { nextAction: string | null; nextActionDueOn: string | null; upcomingMeetingAt: string | null } {
  const mine = tasks.filter(
    (t) => isOpenTask(t) && (t.contactId === contactId || t.entityId === contactId),
  );
  const dated = mine
    .filter((t) => t.dueOn)
    .sort((a, b) => Date.parse(a.dueOn || "") - Date.parse(b.dueOn || ""));
  const next = dated[0];
  const meetings = dated.filter(isMeetingTask).filter((t) => Date.parse(t.dueOn || "") >= startOfDay(nowMs));
  return {
    nextAction: next?.title || next?.predefinedDescription || plan?.objective || null,
    nextActionDueOn: next?.dueOn || plan?.nextReviewAt || null,
    upcomingMeetingAt: meetings[0]?.dueOn ?? null,
  };
}

function matchesSearch(row: ContactStrategyRow, q: string): boolean {
  if (!q) return true;
  const hay = [
    row.contactName,
    row.companyName,
    row.opportunityRef,
    row.dealRef,
    row.assignedEmployeeName,
    row.contactRole,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function matchesFilters(row: ContactStrategyRow, filters: ContactStrategyFilters | undefined, nowMs: number): boolean {
  if (!filters) return true;
  const q = filters.q?.trim().toLowerCase() ?? "";
  if (q && !matchesSearch(row, q)) return false;
  if (filters.relationshipState && filters.relationshipState !== "all" && row.relationshipState !== filters.relationshipState) {
    return false;
  }
  if (filters.activityBand && filters.activityBand !== "all" && row.relationshipState !== filters.activityBand) {
    return false;
  }
  if (filters.contactRole && filters.contactRole !== "all" && row.contactRole !== filters.contactRole) {
    return false;
  }
  if (
    filters.assignedEmployeeId &&
    filters.assignedEmployeeId !== "all" &&
    row.assignedEmployeeId !== filters.assignedEmployeeId
  ) {
    return false;
  }
  if (filters.companyId && filters.companyId !== "all" && row.companyId !== filters.companyId) {
    return false;
  }
  if (filters.linkedTransaction === "opportunity" && !row.opportunityId) return false;
  if (filters.linkedTransaction === "deal" && !row.dealId) return false;
  if (filters.linkedTransaction === "none" && (row.opportunityId || row.dealId)) return false;
  if (filters.nextActionDue === "today" && !isDueToday(row.nextActionDueOn, nowMs)) return false;
  if (filters.nextActionDue === "overdue" && !isOverdue(row.nextActionDueOn, nowMs)) return false;
  if (filters.nextActionDue === "upcoming" && !isUpcoming(row.nextActionDueOn, nowMs)) return false;
  if (filters.kpi === "strategic" && !row.strategic) return false;
  if (filters.kpi === "due_today" && !isDueToday(row.nextActionDueOn, nowMs)) return false;
  if (filters.kpi === "needs_attention" && row.relationshipState !== "needs_attention") return false;
  if (filters.kpi === "dormant" && row.relationshipState !== "dormant") return false;
  if (filters.kpi === "upcoming_meetings" && !row.upcomingMeetingAt) return false;
  return true;
}

export function emptyContactStrategyKpis(): ContactStrategyKpis {
  return {
    strategic: 0,
    due_today: 0,
    needs_attention: 0,
    dormant: 0,
    upcoming_meetings: 0,
  };
}

export function tallyContactStrategyKpis(
  rows: ContactStrategyRow[],
  nowMs = Date.now(),
): ContactStrategyKpis {
  const kpis = emptyContactStrategyKpis();
  for (const row of rows) {
    if (row.strategic) kpis.strategic += 1;
    if (isDueToday(row.nextActionDueOn, nowMs)) kpis.due_today += 1;
    if (row.relationshipState === "needs_attention") kpis.needs_attention += 1;
    if (row.relationshipState === "dormant") kpis.dormant += 1;
    if (row.upcomingMeetingAt) kpis.upcoming_meetings += 1;
  }
  return kpis;
}

export function composeContactStrategySnapshot(
  input: ContactStrategyComposeInput,
): ContactStrategySnapshot {
  const nowMs = input.nowMs ?? Date.now();
  const events = input.events.filter(
    (event) => !stickyNoteMustNotEnterSharedActivity(event.sourceSystem),
  );
  const planByContact = new Map(
    (input.plans ?? []).map((plan) => [plan.contactId, plan] as const),
  );

  const authorised: ContactStrategyRow[] = [];

  for (const contact of input.contacts) {
    const linkedOpps = input.opportunities.filter(
      (o) =>
        o.primaryContactId === contact.id ||
        (contact.companyId && o.companyId === contact.companyId),
    );
    const linkedDeals = input.deals.filter(
      (d) =>
        d.primaryContactId === contact.id ||
        linkedOpps.some((o) => o.id === d.opportunityId),
    );
    const assignedFromTx = [
      ...linkedOpps.flatMap((o) => [
        ...(o.assignedUserIds ?? []),
        o.primaryOwnerUserId ?? "",
      ]),
      ...linkedDeals.flatMap((d) => [
        ...(d.assignedUserIds ?? []),
        d.primaryOwnerUserId ?? "",
      ]),
    ].filter(Boolean);

    if (
      !contactStrategyActorMaySee({
        actor: input.actor,
        downlineUserIds: input.downlineUserIds,
        ownerId: contact.ownerId,
        ownerName: contact.ownerName,
        assignedUserIds: assignedFromTx,
      })
    ) {
      continue;
    }

    const opp = pickLinkedOpportunity(contact.id, contact.companyId ?? null, input.opportunities);
    const deal = pickLinkedDeal(contact.id, opp?.id ?? null, input.deals);
    const latest = latestMeaningfulInteraction(events, contact.id);
    const lastAt = latest?.occurredAt ?? null;
    const days = lastAt ? Math.floor(daysSinceIsoAt(lastAt, nowMs)) : null;
    const band: ContactStrategyActivityBand = activityBandFromLastMeaningfulAt(lastAt, nowMs);
    const plan = planByContact.get(contact.id);
    const next = pickNextAction(contact.id, plan, input.tasks, nowMs);
    const recent = events
      .filter((event) => String(event.contactId || "") === contact.id)
      .filter(isMeaningfulRelationshipInteraction)
      .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
      .slice(0, 5)
      .map((event) => ({
        at: event.occurredAt,
        label: event.title,
        channel: classifyMeaningfulInteractionChannel(event),
      }));

    const businessValue = deriveContact360BusinessValue(
      linkedOpps.map((o) => ({ id: o.id, requestedAmount: o.requestedAmount ?? null })),
      linkedDeals.map((d) => ({
        opportunityId: d.opportunityId ?? null,
        requestedAmount: d.requestedAmount ?? null,
        approvedAmount: d.approvedAmount ?? null,
        fulfilledAmount: d.fulfilledAmount ?? null,
      })),
    );

    authorised.push({
      contactId: contact.id,
      contactName: contact.name,
      companyId: contact.companyId ?? null,
      companyName: contact.companyName ?? null,
      contactRole: roleLabel(contact.primaryRole),
      relationshipState: band,
      relationshipScore:
        typeof contact.contactScore === "number" && Number.isFinite(contact.contactScore)
          ? Math.round(contact.contactScore)
          : 0,
      lastMeaningfulAt: lastAt,
      lastMeaningfulLabel: latest?.title ?? null,
      lastMeaningfulChannel: latest ? classifyMeaningfulInteractionChannel(latest) : null,
      daysSinceMeaningful: days,
      assignedEmployeeId: plan?.assignedOwnerUserId ?? contact.ownerId ?? null,
      assignedEmployeeName: plan?.assignedOwnerName ?? contact.ownerName ?? null,
      opportunityId: opp?.id ?? null,
      opportunityRef: opp?.opportunityNumber ?? null,
      dealId: deal?.id ?? null,
      dealRef: deal?.dealNumber ?? null,
      businessValue,
      nextAction: next.nextAction,
      nextActionDueOn: next.nextActionDueOn,
      cadence: asCadence(plan?.cadence),
      preferredChannel: asChannel(plan?.preferredChannel),
      strategic: Boolean(contact.strategicContact),
      upcomingMeetingAt: next.upcomingMeetingAt,
      relationshipObjective: plan?.objective ?? null,
      nextReviewAt: plan?.nextReviewAt ?? null,
      recentMeaningful: recent,
    });
  }

  const kpis = tallyContactStrategyKpis(authorised, nowMs);
  const rows = authorised
    .filter((row) => matchesFilters(row, input.filters, nowMs))
    .sort((a, b) => {
      const aDue = a.nextActionDueOn ? Date.parse(a.nextActionDueOn) : Number.POSITIVE_INFINITY;
      const bDue = b.nextActionDueOn ? Date.parse(b.nextActionDueOn) : Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;
      const aDays = a.daysSinceMeaningful ?? Number.POSITIVE_INFINITY;
      const bDays = b.daysSinceMeaningful ?? Number.POSITIVE_INFINITY;
      if (aDays !== bDays) return bDays - aDays;
      return a.contactName.localeCompare(b.contactName, "en", { sensitivity: "base" });
    });

  const snapshot: ContactStrategySnapshot = {
    sprint: CONTACT_STRATEGY_SPRINT,
    asOf: new Date(nowMs).toISOString(),
    kpis,
    rows,
    total: rows.length,
  };
  assertNoContactStrategyPii(snapshot);
  return snapshot;
}

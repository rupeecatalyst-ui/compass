/**
 * CO-C1-ACTIVITY-DIALOGUE-TIMELINE-010
 * Human-readable Activity & Dialogue compose over Enterprise Activity Registry.
 * Not a second chronology store.
 */

import { ROUTES } from "@/constants/routes";
import {
  ACTIVITY_DIALOGUE_TIMELINE_DISPLAY_TIMEZONE,
  DETAILED_TIMELINE_EVENT_TYPE_LABELS,
  DETAILED_TIMELINE_EXCLUDED_KINDS,
  DETAILED_TIMELINE_EXCLUDED_SOURCES,
  DETAILED_TIMELINE_SOURCE_WORKSPACE,
  DETAILED_TIMELINE_SYSTEM_PROCESS,
} from "@/constants/activity-dialogue-timeline";
import { stickyNoteMustNotEnterSharedActivity } from "@/lib/sticky-notes/owner-scope";
import {
  redactContactValuesInText,
  redactCustomerContactPiiForAiContext,
  textContainsCustomerContactPii,
} from "@/lib/chanakya-enterprise-read-context/redact-pii";
import { buildDealWorkspaceHref } from "@/lib/loan-journey/adr-018-routing";
import { buildCanonicalJourneyStageHref } from "@/constants/canonical-journey-header";
import { buildDocumentWorkspaceHref } from "@/lib/document-workspace/context-lock";
import { buildAccountingCaseHref } from "@/lib/accounting-workspace/resolve-workbench";
import {
  actorCanSeeCase,
  hasOrgWideCaseVisibility,
  type CaseVisibilityActor,
} from "@/lib/enterprise-case-visibility";
import { ROLES } from "@/constants/roles";
import type { EnterpriseActivityEvent } from "@/types/enterprise-activity-registry";
import type {
  DetailedTimelineActor,
  DetailedTimelineCounts,
  DetailedTimelineEventType,
  DetailedTimelineExactWhen,
  DetailedTimelineFilters,
  DetailedTimelineGraphContext,
  DetailedTimelineHrefSet,
  DetailedTimelineRow,
  DetailedTimelineStatusFilter,
} from "@/types/activity-dialogue-timeline";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? redactContactValuesInText(text) : null;
}

function firstString(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = str(payload[key]);
    if (value) return value;
  }
  return null;
}

export function looksLikeRawEventCode(title: string | null | undefined): boolean {
  const t = (title || "").trim();
  if (!t) return true;
  if (/^(Deal|Opportunity)\s+\S+\s+updated$/i.test(t)) return true;
  if (/^[A-Z][A-Z0-9_]{3,}$/.test(t)) return true;
  if (/^[a-z0-9]+([._:-][a-z0-9]+){1,}$/i.test(t) && !/\s/.test(t)) return true;
  return false;
}

export function isChanakyaHistoryEvent(event: Pick<EnterpriseActivityEvent, "eventKind" | "sourceSystem" | "title" | "summary">): boolean {
  const kind = String(event.eventKind || "").toLowerCase();
  const source = String(event.sourceSystem || "").toLowerCase();
  if ((DETAILED_TIMELINE_EXCLUDED_KINDS as readonly string[]).includes(kind)) return true;
  if ((DETAILED_TIMELINE_EXCLUDED_SOURCES as readonly string[]).includes(source)) return true;
  if (source.includes("chanakya") || kind === "chanakya") return true;
  const hay = `${event.title || ""} ${event.summary || ""}`.toLowerCase();
  if (/\bchanakya (chat|conversation|session)\b/.test(hay)) return true;
  return false;
}

const NOISE_TITLE_RE =
  /\b(hydrate|heartbeat|ping|debug|shadow|telemetry|radar vector|ops pulse)\b/i;

export function isExcludedPrivateOrAdvisoryEvent(event: EnterpriseActivityEvent): boolean {
  if (stickyNoteMustNotEnterSharedActivity(event.sourceSystem)) return true;
  if (isChanakyaHistoryEvent(event)) return true;
  const title = (event.title || "").trim();
  if (!title) return true;
  if (NOISE_TITLE_RE.test(title) || NOISE_TITLE_RE.test(event.summary || "")) return true;
  return false;
}

export function classifyDetailedTimelineEventType(
  event: EnterpriseActivityEvent,
): DetailedTimelineEventType {
  const kind = String(event.eventKind || "").toLowerCase();
  const source = String(event.sourceSystem || "").toLowerCase();
  const payload = asRecord(event.payload);
  const hay = `${event.title || ""} ${event.summary || ""} ${firstString(payload, ["dealEventType", "eventType", "kind"]) || ""}`.toLowerCase();

  if (
    source === "accounting" ||
    kind.includes("accounting") ||
    hay.includes("accounting case") ||
    hay.includes("invoice") && hay.includes("posted")
  ) {
    return "accounting";
  }
  if (
    hay.includes("assign") ||
    hay.includes("reassign") ||
    firstString(payload, ["assignmentField", "previousOwner", "newOwner", "fromEmployee", "toEmployee"])
  ) {
    return "assignment_changes";
  }
  if (
    source === "inbound_email" ||
    source === "outbox" ||
    source === "ecie" ||
    kind === "communications"
  ) {
    return "communications";
  }
  if (kind === "notes" || source === "business_notes") return "notes";
  if (kind === "documents" || source === "document" || source === "document_request" || source === "customer_portal") {
    return "documents";
  }
  if (kind === "tasks" || source === "ete") return "tasks";
  if (
    kind === "stage_change" ||
    hay.includes("stage changed") ||
    firstString(payload, ["previousStage", "newStage", "fromGrossStage", "toGrossStage"])
  ) {
    return "stage_changes";
  }
  if (kind === "dialogue" || kind === "opportunity" || source === "deal_activity") {
    return "activities";
  }
  return "system_events";
}

export function resolveSourceWorkspaceLabel(event: EnterpriseActivityEvent): string {
  const payload = asRecord(event.payload);
  const explicit = firstString(payload, ["sourceWorkspace", "workspaceLabel", "workspace"]);
  if (explicit && !looksLikeRawEventCode(explicit)) return explicit;
  const source = String(event.sourceSystem || "").toLowerCase();
  return DETAILED_TIMELINE_SOURCE_WORKSPACE[source] || "Catalyst One";
}

export function resolveSystemProcess(event: EnterpriseActivityEvent): string | null {
  const payload = asRecord(event.payload);
  const named = firstString(payload, ["processName", "ruleName", "trigger", "automationName"]);
  if (named) return named;
  const source = String(event.sourceSystem || "").toLowerCase();
  return DETAILED_TIMELINE_SYSTEM_PROCESS[source] || "an automated Catalyst One process";
}

export function resolveActorPresentation(event: EnterpriseActivityEvent): {
  actorLabel: string;
  actorRole: string;
  isSystemActor: boolean;
} {
  const payload = asRecord(event.payload);
  const name =
    str(event.actorName) ||
    firstString(payload, ["actorLabel", "actorName", "createdByName", "performedByName"]);
  const role =
    firstString(payload, ["actorRole", "actorRoleLabel", "roleLabel"]) ||
    (event.actorUserId ? "Employee" : "System");
  const flaggedSystem =
    payload.systemActor === true ||
    String(firstString(payload, ["actorType"]) || "").toLowerCase() === "system";
  if (!name || flaggedSystem || /^system$/i.test(name)) {
    return { actorLabel: "System", actorRole: "System", isSystemActor: true };
  }
  return { actorLabel: name, actorRole: role, isSystemActor: false };
}

export function extractBeforeAfter(event: EnterpriseActivityEvent): {
  beforeValue: string | null;
  afterValue: string | null;
} {
  const payload = asRecord(event.payload);
  const changes = payload.changes;
  if (Array.isArray(changes) && changes.length > 0) {
    const first = asRecord(changes[0]);
    return {
      beforeValue: firstString(first, ["from", "previous", "before", "oldValue"]),
      afterValue: firstString(first, ["to", "next", "after", "newValue"]),
    };
  }
  return {
    beforeValue: firstString(payload, [
      "previousValue",
      "fromValue",
      "oldValue",
      "previousStage",
      "fromStage",
      "fromGrossStage",
      "previousOwner",
      "fromEmployee",
      "fromOwnerName",
      "previousAssignee",
    ]),
    afterValue: firstString(payload, [
      "newValue",
      "toValue",
      "afterValue",
      "newStage",
      "toStage",
      "toGrossStage",
      "newOwner",
      "toEmployee",
      "toOwnerName",
      "newAssignee",
    ]),
  };
}

export function formatLoanAmountLabel(value: unknown): string | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[,₹\s]/g, ""));
  if (!Number.isFinite(n)) return redactContactValuesInText(String(value));
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;
}

export function formatExactOccurredAt(
  iso: string,
  timeZone = ACTIVITY_DIALOGUE_TIMELINE_DISPLAY_TIMEZONE,
): DetailedTimelineExactWhen {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return {
      iso,
      dateLabel: "—",
      timeWithSeconds: "—",
      timezone: timeZone,
      timezoneOffset: "",
      dayGroupKey: "unknown",
      dayGroupLabel: "Unknown date",
    };
  }
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
  const timeWithSeconds = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(d);
  const offsetParts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  }).formatToParts(d);
  const offset =
    offsetParts.find((p) => p.type === "timeZoneName")?.value?.replace("GMT", "UTC") || "";
  const tzShort =
    timeZone === "Asia/Kolkata" ? "IST" : timeZone;
  const dayGroupKey = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return {
    iso,
    dateLabel,
    timeWithSeconds,
    timezone: `${tzShort} (${timeZone}${offset ? ` · ${offset}` : ""})`,
    timezoneOffset: offset,
    dayGroupKey,
    dayGroupLabel: dateLabel,
  };
}

export function earDedupeKey(event: Pick<EnterpriseActivityEvent, "id" | "sourceSystem" | "sourceEventId">): string {
  if (event.sourceSystem && event.sourceEventId) {
    return `${event.sourceSystem}:${event.sourceEventId}`;
  }
  return event.id;
}

export function dedupeEnterpriseActivityEvents(
  events: EnterpriseActivityEvent[],
): EnterpriseActivityEvent[] {
  const byKey = new Map<string, EnterpriseActivityEvent>();
  const seenIds = new Set<string>();
  for (const event of events) {
    if (seenIds.has(event.id)) continue;
    const key = earDedupeKey(event);
    const existing = byKey.get(key);
    if (existing) {
      const newer =
        new Date(event.occurredAt).getTime() - new Date(existing.occurredAt).getTime();
      if (newer > 0) byKey.set(key, event);
      continue;
    }
    seenIds.add(event.id);
    byKey.set(key, event);
  }
  return [...byKey.values()];
}

export function sortTimelineEventsNewestFirst<T extends { occurredAt: string; id: string }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const dt = new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
    if (dt !== 0) return dt;
    return b.id.localeCompare(a.id);
  });
}

export function canExposeTimelineTechnicalDetails(role?: string | null): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}

function graphForEvent(
  event: EnterpriseActivityEvent,
  graph: DetailedTimelineGraphContext[] | undefined,
): DetailedTimelineGraphContext | null {
  if (!graph?.length) return null;
  if (event.dealId) {
    const deal = graph.find((g) => g.dealId && g.dealId === event.dealId);
    if (deal) return deal;
  }
  if (event.opportunityId) {
    const opp = graph.find(
      (g) => g.opportunityId === event.opportunityId && (!event.dealId || g.dealId === event.dealId),
    );
    if (opp) return opp;
    return graph.find((g) => g.opportunityId === event.opportunityId && !g.dealId) ?? null;
  }
  if (event.contactId) {
    return graph.find((g) => g.contactId === event.contactId) ?? null;
  }
  return null;
}

export function buildDetailedTimelineHrefs(input: {
  event: EnterpriseActivityEvent;
  ctx: DetailedTimelineGraphContext | null;
  relatedAccountingCaseId?: string | null;
}): DetailedTimelineHrefSet {
  const { event, ctx } = input;
  const opportunityId = event.opportunityId || ctx?.opportunityId || null;
  const dealId = event.dealId || ctx?.dealId || null;
  const contactId = event.contactId || ctx?.contactId || null;
  const companyId = ctx?.companyId || firstString(asRecord(event.payload), ["companyId"]);
  const payload = asRecord(event.payload);

  const customer = contactId
    ? `${ROUTES.CONTACTS}?contact=${encodeURIComponent(contactId)}&view=customer-360`
    : null;
  const company = companyId
    ? `${ROUTES.CONTACTS}?company=${encodeURIComponent(companyId)}`
    : null;
  const opportunity = opportunityId
    ? buildCanonicalJourneyStageHref("lead_creation", { opportunityId, dealId })
    : null;
  const deal = dealId
    ? buildDealWorkspaceHref({ dealId, opportunityId })
    : null;
  const document = event.documentId
    ? buildDocumentWorkspaceHref({
        contactId,
        companyId,
        opportunityId,
        dealId,
        documentId: event.documentId,
      })
    : null;
  const task = event.taskId ? `${ROUTES.TASKS}?task=${encodeURIComponent(event.taskId)}` : null;
  const accountingCaseId =
    input.relatedAccountingCaseId ||
    firstString(payload, ["accountingCaseId", "caseId"]);
  const accounting = accountingCaseId ? buildAccountingCaseHref(accountingCaseId) : null;

  const eventType = classifyDetailedTimelineEventType(event);
  let openTransaction: string | null = null;
  if (eventType === "accounting" && accounting) openTransaction = accounting;
  else if (eventType === "documents" && document) openTransaction = document;
  else if (eventType === "tasks" && task) openTransaction = task;
  else if (deal) openTransaction = deal;
  else if (opportunity) openTransaction = opportunity;
  else if (customer) openTransaction = customer;
  else if (company) openTransaction = company;

  return {
    openTransaction,
    customer,
    company,
    opportunity,
    deal,
    document,
    task,
    accounting,
  };
}

function assignmentFieldLabel(payload: Record<string, unknown>): string {
  return (
    firstString(payload, ["assignmentField", "fieldLabel", "changedField"]) ||
    "Rupee Catalyst employee"
  );
}

function documentCount(payload: Record<string, unknown>): number {
  const n = payload.documentCount ?? payload.count ?? payload.uploadedCount;
  if (typeof n === "number" && Number.isFinite(n)) return n;
  if (Array.isArray(payload.documentIds)) return payload.documentIds.length;
  return 1;
}

function deliveryStatus(event: EnterpriseActivityEvent): string | null {
  const payload = asRecord(event.payload);
  return firstString(payload, [
    "deliveryStatus",
    "statusLabel",
    "status",
    "matchStatus",
    "reviewStatus",
  ]);
}

export function composeHumanReadableNarrative(
  event: EnterpriseActivityEvent,
  ctx?: DetailedTimelineGraphContext | null,
): { title: string; explanation: string } {
  const payload = asRecord(event.payload);
  const eventType = classifyDetailedTimelineEventType(event);
  const actor = resolveActorPresentation(event);
  const source = resolveSourceWorkspaceLabel(event);
  const pair = extractBeforeAfter(event);
  const status = deliveryStatus(event);
  const process = resolveSystemProcess(event);

  if (eventType === "assignment_changes") {
    const field = assignmentFieldLabel(payload);
    const title = `${field} changed from ${pair.beforeValue || "Not Specified"} to ${pair.afterValue || "Not Specified"} by ${actor.actorLabel} through ${source}.`;
    return {
      title,
      explanation: actor.isSystemActor
        ? `System applied the ${field.toLowerCase()} change via ${process}.`
        : `${actor.actorLabel} (${actor.actorRole}) updated the ${field.toLowerCase()} assignment.`,
    };
  }

  if (eventType === "stage_changes") {
    const title = `Deal stage changed from ${pair.beforeValue || "Not Specified"} to ${pair.afterValue || "Not Specified"} by ${actor.actorLabel} in ${source}.`;
    return {
      title,
      explanation: actor.isSystemActor
        ? `Triggered by ${process}.`
        : `${actor.actorLabel} moved the lender Deal through ${source}.`,
    };
  }

  if (eventType === "documents") {
    const count = documentCount(payload);
    const awaiting =
      status && /review|pending|await/i.test(status)
        ? " and are awaiting review"
        : status
          ? ` with status ${status}`
          : "";
    const who = actor.isSystemActor ? "System" : actor.actorLabel;
    const title =
      count === 1
        ? `A document was uploaded by ${who} through ${source}${awaiting}.`
        : `${count === 3 ? "Three" : String(count)} documents were uploaded by ${who} through ${source}${awaiting}.`;
    return {
      title,
      explanation: actor.isSystemActor
        ? `Triggered by ${process}.`
        : `${who} submitted document(s) that remain on the Enterprise Document Registry.`,
    };
  }

  if (eventType === "communications") {
    const queuedBy = actor.isSystemActor ? "System" : actor.actorLabel;
    const inbound =
      String(event.sourceSystem || "").toLowerCase() === "inbound_email" ||
      String(firstString(payload, ["kind", "eventType"]) || "").toLowerCase() ===
        "email_received";
    if (inbound) {
      return {
        title: `An inbound email was received${status ? ` and marked ${status}` : ""} through Incoming Email.`,
        explanation: actor.isSystemActor
          ? `Triggered by ${process}.`
          : `Communication captured on the Enterprise Activity Registry.`,
      };
    }
    const later = status
      ? ` and later marked ${status} by ${process || "the Outbox service"}`
      : "";
    const title = `Follow-up email was queued by ${queuedBy}${later}.`;
    return {
      title,
      explanation: actor.isSystemActor
        ? `Triggered by ${process}. No person sent this message directly.`
        : `${queuedBy} queued a communication. Delivery is recorded by the Outbox — this desk does not send.`,
    };
  }

  if (eventType === "tasks") {
    const title = actor.isSystemActor
      ? `A task was ${status || "updated"} by System via ${process}.`
      : `A task was ${status || "updated"} by ${actor.actorLabel} through ${source}.`;
    return {
      title,
      explanation: str(event.summary) || "Task Engine remains the work SSOT.",
    };
  }

  if (eventType === "notes") {
    const title = actor.isSystemActor
      ? `A business note was recorded by System via ${process}.`
      : `A business note was added by ${actor.actorLabel} through ${source}.`;
    return { title, explanation: str(event.summary) || "Official business note on this transaction." };
  }

  if (eventType === "accounting") {
    const title = actor.isSystemActor
      ? `An accounting event was posted by System via ${process}.`
      : `An accounting event was recorded by ${actor.actorLabel} through ${source}.`;
    return {
      title,
      explanation: str(event.summary) || "Open the Accounting Case for posting detail.",
    };
  }

  if (eventType === "system_events" || actor.isSystemActor) {
    const raw = looksLikeRawEventCode(event.title) ? null : str(event.title);
    const title = raw || `System completed a ${source} process.`;
    return {
      title,
      explanation: `Triggered by ${process}. This was not performed by a person.`,
    };
  }

  if (!looksLikeRawEventCode(event.title)) {
    const title = str(event.title) || "Activity recorded";
    return {
      title,
      explanation:
        str(event.summary) ||
        `${actor.actorLabel} recorded this through ${source}${ctx?.dealNumber ? ` for ${ctx.dealNumber}` : ""}.`,
    };
  }

  const entity = ctx?.dealNumber || ctx?.opportunityNumber || "the transaction";
  return {
    title: `${entity} was updated by ${actor.actorLabel} through ${source}.`,
    explanation:
      pair.beforeValue || pair.afterValue
        ? `Changed from ${pair.beforeValue || "—"} to ${pair.afterValue || "—"}.`
        : str(event.summary) || `${actor.actorLabel} saved changes in ${source}.`,
  };
}

export function composeDetailedTimelineRow(
  event: EnterpriseActivityEvent,
  options?: {
    graph?: DetailedTimelineGraphContext[];
    actorRole?: string | null;
    includeTechnical?: boolean;
  },
): DetailedTimelineRow {
  const ctx = graphForEvent(event, options?.graph);
  const payload = asRecord(event.payload);
  const eventType = classifyDetailedTimelineEventType(event);
  const actor = resolveActorPresentation(event);
  const pair = extractBeforeAfter(event);
  const narrative = composeHumanReadableNarrative(event, ctx);
  const accountingCaseId = firstString(payload, ["accountingCaseId", "caseId"]);
  const hrefs = buildDetailedTimelineHrefs({
    event,
    ctx,
    relatedAccountingCaseId: accountingCaseId,
  });
  const amount =
    formatLoanAmountLabel(payload.loanAmount ?? payload.requiredAmount ?? ctx?.loanAmount) ||
    null;
  const status = deliveryStatus(event);
  const needsAttention =
    payload.needsAttention === true ||
    /needs_review|unmatched|received|pending_review|failed/i.test(status || "");

  const technical = options?.includeTechnical
    ? (redactCustomerContactPiiForAiContext({
        eventKind: event.eventKind,
        sourceSystem: event.sourceSystem,
        sourceEventId: event.sourceEventId,
        payload,
      }) as Record<string, unknown>)
    : null;

  const copyReference = [
    event.opportunityId ? `opportunity:${event.opportunityId}` : null,
    event.dealId ? `deal:${event.dealId}` : null,
    `event:${event.id}`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: event.id,
    sourceEventId: event.sourceEventId,
    sourceSystem: String(event.sourceSystem || ""),
    eventKind: String(event.eventKind || ""),
    eventType,
    eventTypeLabel: DETAILED_TIMELINE_EVENT_TYPE_LABELS[eventType],
    title: narrative.title,
    explanation: narrative.explanation,
    actorLabel: actor.actorLabel,
    actorRole: actor.actorRole,
    actorUserId: event.actorUserId,
    isSystemActor: actor.isSystemActor,
    systemProcess: actor.isSystemActor ? resolveSystemProcess(event) : null,
    occurredAt: event.occurredAt,
    when: formatExactOccurredAt(event.occurredAt),
    sourceWorkspace: resolveSourceWorkspaceLabel(event),
    customerLabel: str(ctx?.customerLabel) || firstString(payload, ["customerLabel", "primaryContactName"]),
    companyLabel: str(ctx?.companyLabel) || firstString(payload, ["companyName", "companyLabel"]),
    lenderId: str(ctx?.lenderId) || firstString(payload, ["lenderId", "institutionId"]),
    lenderLabel:
      str(ctx?.lenderLabel) ||
      firstString(payload, ["lenderName", "primaryCounterpartyName", "institutionName"]),
    productLabel: str(ctx?.productLabel) || firstString(payload, ["productLabel", "product"]),
    loanAmountLabel: amount,
    opportunityId: event.opportunityId || ctx?.opportunityId || null,
    opportunityNumber: str(ctx?.opportunityNumber) || firstString(payload, ["opportunityNumber"]),
    dealId: event.dealId || ctx?.dealId || null,
    dealNumber: str(ctx?.dealNumber) || firstString(payload, ["dealNumber"]),
    currentStage: str(ctx?.currentStage) || firstString(payload, ["currentStage", "newStage", "toGrossStage"]),
    beforeValue: pair.beforeValue,
    afterValue: pair.afterValue,
    deliveryStatus: status,
    needsAttention,
    contactId: event.contactId || ctx?.contactId || null,
    companyId: ctx?.companyId || firstString(payload, ["companyId"]),
    taskId: event.taskId,
    documentId: event.documentId,
    documentVersion: firstString(payload, ["documentVersion", "version", "versionLabel"]),
    relatedOutboxId: firstString(payload, ["outboxId", "outboxRecordId"]),
    relatedAccountingCaseId: accountingCaseId,
    inboundEmailId: firstString(payload, ["inboundEmailId"]),
    hrefs,
    copyReference,
    technicalDetails: technical,
  };
}

export function emptyDetailedTimelineFilters(): DetailedTimelineFilters {
  return {
    since: null,
    until: null,
    opportunityId: null,
    dealId: null,
    contactId: null,
    companyId: null,
    actorUserId: null,
    lenderId: null,
    product: null,
    eventType: "all",
    sourceWorkspace: null,
    status: "all",
    search: "",
  };
}

function statusMatches(row: DetailedTimelineRow, status: DetailedTimelineStatusFilter): boolean {
  if (status === "all") return true;
  if (status === "needs_attention") return row.needsAttention;
  const s = (row.deliveryStatus || "").toLowerCase();
  if (status === "queued") return s.includes("queue");
  if (status === "delivered") return s.includes("deliver");
  if (status === "completed") return s.includes("complete");
  if (status === "pending_review") return /review|pending|await/.test(s);
  if (status === "failed") return s.includes("fail");
  return true;
}

export function rowMatchesDetailedTimelineFilters(
  row: DetailedTimelineRow,
  filters: DetailedTimelineFilters,
): boolean {
  if (filters.eventType !== "all" && row.eventType !== filters.eventType) return false;
  if (filters.opportunityId && row.opportunityId !== filters.opportunityId) return false;
  if (filters.dealId && row.dealId !== filters.dealId) return false;
  if (filters.contactId && row.contactId !== filters.contactId) return false;
  if (filters.companyId && row.companyId !== filters.companyId) return false;
  if (filters.actorUserId && row.actorUserId !== filters.actorUserId) return false;
  if (filters.lenderId) {
    const lid = filters.lenderId.trim();
    if (lid && row.lenderId !== lid) return false;
  }
  if (filters.product) {
    const p = filters.product.trim().toLowerCase();
    if (p && !(row.productLabel || "").toLowerCase().includes(p)) return false;
  }
  if (filters.sourceWorkspace) {
    const sw = filters.sourceWorkspace.trim().toLowerCase();
    if (
      sw &&
      row.sourceWorkspace.toLowerCase() !== sw &&
      row.sourceSystem.toLowerCase() !== sw
    ) {
      return false;
    }
  }
  if (filters.since) {
    if (new Date(row.occurredAt).getTime() < new Date(filters.since).getTime()) return false;
  }
  if (filters.until) {
    if (new Date(row.occurredAt).getTime() > new Date(filters.until).getTime()) return false;
  }
  if (!statusMatches(row, filters.status)) return false;
  const q = filters.search.trim().toLowerCase();
  if (q) {
    const hay = [
      row.id,
      row.title,
      row.explanation,
      row.actorLabel,
      row.customerLabel,
      row.companyLabel,
      row.lenderLabel,
      row.productLabel,
      row.opportunityId,
      row.dealId,
      row.opportunityNumber,
      row.dealNumber,
      row.beforeValue,
      row.afterValue,
      row.copyReference,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export function summarizeDetailedTimelineCounts(
  rows: DetailedTimelineRow[],
  capped = false,
): DetailedTimelineCounts {
  const counts: DetailedTimelineCounts = {
    total: rows.length,
    communications: 0,
    stageChanges: 0,
    documents: 0,
    tasks: 0,
    needsAttention: 0,
    capped,
    complete: !capped,
  };
  for (const row of rows) {
    if (row.eventType === "communications") counts.communications += 1;
    if (row.eventType === "stage_changes") counts.stageChanges += 1;
    if (row.eventType === "documents") counts.documents += 1;
    if (row.eventType === "tasks") counts.tasks += 1;
    if (row.needsAttention) counts.needsAttention += 1;
  }
  return counts;
}

export function eventVisibleToTimelineActor(
  event: EnterpriseActivityEvent,
  actor: DetailedTimelineActor,
  ctx: DetailedTimelineGraphContext | null,
  downlineUserIds?: string[] | null,
): boolean {
  const actorOrg = actor.organizationId?.trim() || "";
  const eventOrg = event.organizationId?.trim() || "";
  if (actorOrg && eventOrg && actorOrg !== eventOrg) return false;

  const visibilityActor: CaseVisibilityActor = {
    userId: actor.userId,
    role: actor.role,
    displayName: actor.displayName,
  };
  if (hasOrgWideCaseVisibility(visibilityActor.role)) return true;

  if (!ctx) {
    const actorId = actor.userId?.trim() || "";
    return Boolean(actorId && event.actorUserId === actorId);
  }
  if (ctx.organizationId && actorOrg && ctx.organizationId !== actorOrg) return false;

  return actorCanSeeCase(
    visibilityActor,
    {
      primaryOwnerUserId: ctx.primaryOwnerUserId,
      relationshipManagerUserId: ctx.relationshipManagerUserId,
      relationshipManagerName: ctx.relationshipManagerName,
      assignedUserIds: ctx.assignedUserIds,
      hierarchyVisibilityUserIds: ctx.hierarchyVisibilityUserIds,
    },
    {
      scope: "my_team",
      downlineUserIds: downlineUserIds ?? (actor.userId ? [actor.userId] : []),
    },
  );
}

export function composeDetailedTimelinePage(
  events: EnterpriseActivityEvent[],
  options?: {
    filters?: DetailedTimelineFilters;
    graph?: DetailedTimelineGraphContext[];
    actor?: DetailedTimelineActor;
    downlineUserIds?: string[] | null;
    includeTechnical?: boolean;
    pageSize?: number;
    scanCapped?: boolean;
  },
): {
  rows: DetailedTimelineRow[];
  counts: DetailedTimelineCounts;
  filtered: DetailedTimelineRow[];
} {
  const filters = options?.filters ?? emptyDetailedTimelineFilters();
  const includeTechnical =
    options?.includeTechnical ?? canExposeTimelineTechnicalDetails(options?.actor?.role);
  const actor = options?.actor;

  const prepared = sortTimelineEventsNewestFirst(
    dedupeEnterpriseActivityEvents(events).filter((event) => !isExcludedPrivateOrAdvisoryEvent(event)),
  );

  const rows = prepared
    .filter((event) => {
      if (!actor) return true;
      return eventVisibleToTimelineActor(
        event,
        actor,
        graphForEvent(event, options?.graph),
        options?.downlineUserIds,
      );
    })
    .map((event) =>
      composeDetailedTimelineRow(event, {
        graph: options?.graph,
        actorRole: actor?.role,
        includeTechnical,
      }),
    );

  const filtered = rows.filter((row) => rowMatchesDetailedTimelineFilters(row, filters));
  const counts = summarizeDetailedTimelineCounts(filtered, Boolean(options?.scanCapped));
  const pageSize = options?.pageSize ?? filtered.length;
  return {
    filtered,
    counts,
    rows: filtered.slice(0, pageSize),
  };
}

export function encodeTimelineCursor(row: { occurredAt: string; id: string }): string {
  return `${row.occurredAt}|${row.id}`;
}

export function decodeTimelineCursor(cursor: string | null | undefined): {
  occurredAt: string;
  id: string;
} | null {
  const raw = (cursor || "").trim();
  if (!raw) return null;
  const idx = raw.lastIndexOf("|");
  if (idx <= 0) return null;
  return { occurredAt: raw.slice(0, idx), id: raw.slice(idx + 1) };
}

export function applyTimelineCursor<T extends { occurredAt: string; id: string }>(
  rows: T[],
  cursor: string | null | undefined,
): T[] {
  const decoded = decodeTimelineCursor(cursor);
  if (!decoded) return rows;
  const boundaryTs = new Date(decoded.occurredAt).getTime();
  return rows.filter((row) => {
    const ts = new Date(row.occurredAt).getTime();
    if (ts < boundaryTs) return true;
    if (ts > boundaryTs) return false;
    return row.id.localeCompare(decoded.id) < 0;
  });
}

export function groupDetailedTimelineRowsByDay(
  rows: DetailedTimelineRow[],
): Array<{ dayKey: string; dayLabel: string; items: DetailedTimelineRow[] }> {
  const groups = new Map<string, { dayLabel: string; items: DetailedTimelineRow[] }>();
  for (const row of rows) {
    const key = row.when.dayGroupKey;
    const existing = groups.get(key);
    if (existing) existing.items.push(row);
    else groups.set(key, { dayLabel: row.when.dayGroupLabel, items: [row] });
  }
  return [...groups.entries()].map(([dayKey, g]) => ({
    dayKey,
    dayLabel: g.dayLabel,
    items: g.items,
  }));
}

export function detailedTimelineRowContainsPii(row: DetailedTimelineRow): boolean {
  return [
    row.title,
    row.explanation,
    row.actorLabel,
    row.customerLabel,
    row.companyLabel,
    row.copyReference,
  ].some((value) => textContainsCustomerContactPii(value || ""));
}

export function toAuthorisedTimelineExportRows(rows: DetailedTimelineRow[]): string[][] {
  const header = [
    "occurredAt",
    "timezone",
    "title",
    "explanation",
    "actor",
    "actorRole",
    "eventType",
    "sourceWorkspace",
    "opportunityId",
    "dealId",
    "status",
  ];
  const body = rows.map((row) => [
    row.when.iso,
    row.when.timezone,
    row.title,
    row.explanation,
    row.actorLabel,
    row.actorRole,
    row.eventTypeLabel,
    row.sourceWorkspace,
    row.opportunityId || "",
    row.dealId || "",
    row.deliveryStatus || "",
  ]);
  return [header, ...body];
}

export function emptyDetailedTimelineCounts(complete = true): DetailedTimelineCounts {
  return {
    total: 0,
    communications: 0,
    stageChanges: 0,
    documents: 0,
    tasks: 0,
    needsAttention: 0,
    capped: !complete,
    complete,
  };
}

export function paginateAuthorisedTimeline(
  events: EnterpriseActivityEvent[],
  options: {
    filters?: DetailedTimelineFilters;
    graph?: DetailedTimelineGraphContext[];
    actor?: DetailedTimelineActor;
    downlineUserIds?: string[] | null;
    includeTechnical?: boolean;
    pageSize: number;
    cursor?: string | null;
    complete?: boolean;
  },
): {
  items: DetailedTimelineRow[];
  pageInfo: { nextCursor: string | null; hasNextPage: boolean };
  summary: DetailedTimelineCounts;
} {
  const composed = composeDetailedTimelinePage(events, {
    filters: options.filters,
    graph: options.graph,
    actor: options.actor,
    downlineUserIds: options.downlineUserIds,
    includeTechnical: options.includeTechnical,
    scanCapped: options.complete === false,
  });
  const afterCursor = applyTimelineCursor(composed.filtered, options.cursor);
  const pageSize = Math.max(1, options.pageSize);
  const page = afterCursor.slice(0, pageSize);
  const hasNextPage = afterCursor.length > pageSize;
  const complete = options.complete !== false;
  return {
    items: page,
    pageInfo: {
      nextCursor: hasNextPage && page.length ? encodeTimelineCursor(page[page.length - 1]) : null,
      hasNextPage,
    },
    summary: {
      ...composed.counts,
      capped: !complete,
      complete,
    },
  };
}

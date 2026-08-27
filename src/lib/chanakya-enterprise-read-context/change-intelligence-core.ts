/**
 * CO-CHANAKYA-003D — Change intelligence core (verify-friendly, no server-only).
 * Maps existing SSOT evidence into the change contract — never fabricates prior/current values.
 */

import type { EnterpriseActivityEvent } from "@/types/enterprise-activity-registry";
import type { EteTask } from "@/types/enterprise-task-engine";
import type { SdeControlledException } from "@/types/system-driven-enterprise";
import {
  classifyEarEvent,
  isOperationalTimelineEvent,
  mapEarEventToTimelineItem,
} from "@/lib/enterprise-activity-registry/transaction-timeline";
import { POST_DISBURSEMENT_EVENT_SOURCE } from "@/constants/post-disbursement-confirmation";
import {
  CHANAKYA_FIELD_AVAILABILITY,
  type ChanakyaAttentionChangeRecord,
  type ChanakyaChangeDomain,
  type ChanakyaChangeIntelligenceContext,
  type ChanakyaChangePeriod,
  type ChanakyaChangeRecord,
  type ChanakyaChangeType,
} from "@/types/chanakya-enterprise-read-context";
import {
  calendarDateToUtcNoon,
  todayIsoDateInTimeZone,
  zonedCalendarDate,
} from "@/lib/enterprise-accounting-invoice/financial-year";

const MEANINGFUL_CHANGE_TYPES = new Set<ChanakyaChangeType>([
  "STAGE_CHANGED",
  "LENDER_STAGE_CHANGED",
  "PAYMENT_RECEIVED",
  "INVOICE_RAISED",
  "INVOICE_SHARED",
  "CREDIT_NOTE_CREATED",
  "POST_DISBURSEMENT_CONFIRMATION_RECEIVED",
  "POST_DISBURSEMENT_CONFIRMATION_PENDING",
  "SYSTEM_EXCEPTION_OPENED",
  "SYSTEM_EXCEPTION_RESOLVED",
  "ACTIVITY_DETERIORATED",
]);

export function resolveChangePeriodBounds(input: {
  period: ChanakyaChangePeriod;
  timeZone: string;
  now?: Date;
}): ChanakyaChangeIntelligenceContext["period"] & { timeZone: string } {
  const now = input.now ?? new Date();
  const cal = zonedCalendarDate(now, input.timeZone);
  const endAt = now.toISOString();
  const endDay = todayIsoDateInTimeZone(input.timeZone, now);

  let startDay: string;
  let label: string;

  if (input.period === "today") {
    startDay = endDay;
    label = "Today";
  } else if (input.period === "since_yesterday") {
    const yesterdayProbe = calendarDateToUtcNoon(cal.year, cal.month, cal.day);
    yesterdayProbe.setUTCDate(yesterdayProbe.getUTCDate() - 1);
    const yCal = zonedCalendarDate(yesterdayProbe, input.timeZone);
    startDay = `${yCal.year}-${String(yCal.month).padStart(2, "0")}-${String(yCal.day).padStart(2, "0")}`;
    label = "Since yesterday";
  } else {
    const weekProbe = calendarDateToUtcNoon(cal.year, cal.month, cal.day);
    weekProbe.setUTCDate(weekProbe.getUTCDate() - 6);
    const wCal = zonedCalendarDate(weekProbe, input.timeZone);
    startDay = `${wCal.year}-${String(wCal.month).padStart(2, "0")}-${String(wCal.day).padStart(2, "0")}`;
    label = "Last 7 days";
  }

  const [sy, sm, sd] = startDay.split("-").map(Number);

  return {
    key: input.period,
    label,
    startAt: calendarDateToUtcNoon(sy, sm, sd).toISOString(),
    endAt,
    timeZone: input.timeZone,
    startDay,
    endDay,
  };
}

export type ChanakyaChangePeriodBounds = ReturnType<typeof resolveChangePeriodBounds>;

export function isTimestampInPeriod(
  iso: string,
  period: ChanakyaChangePeriodBounds,
  now = new Date(),
): boolean {
  const at = new Date(iso);
  if (!Number.isFinite(at.getTime()) || at.getTime() > now.getTime()) return false;

  const eventDay = todayIsoDateInTimeZone(period.timeZone, at);
  return eventDay >= period.startDay && eventDay <= period.endDay;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringField(
  payload: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const v = payload[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function resolveEntityKind(event: EnterpriseActivityEvent): string {
  if (event.dealId) return "deal";
  if (event.opportunityId) return "opportunity";
  if (event.documentId) return "document";
  if (event.taskId) return "task";
  return "enterprise";
}

function resolveEntityId(event: EnterpriseActivityEvent): string {
  return (
    event.dealId ||
    event.opportunityId ||
    event.documentId ||
    event.taskId ||
    event.id
  );
}

function significanceFor(
  changeType: ChanakyaChangeType,
  operational: boolean,
): "meaningful" | "informational" | null {
  if (!operational) return null;
  return MEANINGFUL_CHANGE_TYPES.has(changeType) ? "meaningful" : "informational";
}

function inferDocumentChangeType(
  event: EnterpriseActivityEvent,
  titleLower: string,
): ChanakyaChangeType {
  if (
    titleLower.includes("requirement") ||
    titleLower.includes("outstanding") ||
    titleLower.includes("missing")
  ) {
    return "DOCUMENT_REQUIREMENT_CHANGED";
  }
  if (
    titleLower.includes("status") ||
    titleLower.includes("verified") ||
    titleLower.includes("rejected") ||
    titleLower.includes("received")
  ) {
    return "DOCUMENT_STATUS_CHANGED";
  }
  return "DOCUMENT_ADDED";
}

function inferActivityChangeType(titleLower: string): ChanakyaChangeType | null {
  if (
    titleLower.includes("resumed") ||
    titleLower.includes("activity resumed") ||
    titleLower.includes("follow-up resumed")
  ) {
    return "ACTIVITY_RESUMED";
  }
  if (
    titleLower.includes("stopped") ||
    titleLower.includes("idle") ||
    titleLower.includes("no activity") ||
    titleLower.includes("deteriorat")
  ) {
    if (titleLower.includes("deteriorat") || titleLower.includes("idle")) {
      return "ACTIVITY_DETERIORATED";
    }
    return "ACTIVITY_STOPPED";
  }
  return null;
}

export function mapEarEventToChangeRecord(
  event: EnterpriseActivityEvent,
  observedAt: string,
  refs?: {
    opportunityNumber?: string | null;
    dealNumber?: string | null;
  },
): ChanakyaChangeRecord | null {
  if (!isOperationalTimelineEvent(event)) return null;

  const category = classifyEarEvent(event);
  const item = mapEarEventToTimelineItem(event, { mode: "global" });
  const titleLower = `${event.title || ""} ${event.summary || ""}`.toLowerCase();
  const source = (event.sourceSystem || "").toLowerCase();
  const payload = asRecord(event.payload);

  let domain: ChanakyaChangeDomain = "activity";
  let changeType: ChanakyaChangeType | null = null;
  let previousValue: string | null = item.previousValue;
  let currentValue: string | null = item.newValue;

  if (source === POST_DISBURSEMENT_EVENT_SOURCE) {
    domain = "post_disbursement";
    if (
      titleLower.includes("received") ||
      titleLower.includes("confirmation received")
    ) {
      changeType = "POST_DISBURSEMENT_CONFIRMATION_RECEIVED";
    } else if (
      titleLower.includes("pending") ||
      titleLower.includes("confirmation pending")
    ) {
      changeType = "POST_DISBURSEMENT_CONFIRMATION_PENDING";
    }
  } else if (category === "stage_change" || category === "approval") {
    const isLender =
      source === "deal_timeline" ||
      source === "deal_activity" ||
      titleLower.includes("lender");
    domain = isLender ? "lender" : "stage";
    changeType = isLender ? "LENDER_STAGE_CHANGED" : "STAGE_CHANGED";
  } else if (category === "disbursement") {
    domain = "stage";
    changeType = "STAGE_CHANGED";
    if (!previousValue) {
      previousValue = stringField(payload, ["fromStage", "previousStage"]);
    }
    if (!currentValue) {
      currentValue = stringField(payload, ["toStage", "newStage", "stage"]) || "Disbursed";
    }
  } else if (category === "document") {
    domain = "documents";
    changeType = inferDocumentChangeType(event, titleLower);
    previousValue = null;
    currentValue = null;
  } else if (category === "task") {
    domain = "tasks";
    if (titleLower.includes("completed") || titleLower.includes("complete")) {
      changeType = "TASK_COMPLETED";
    } else if (titleLower.includes("overdue")) {
      changeType = "TASK_BECAME_OVERDUE";
    } else {
      changeType = "TASK_CREATED";
    }
    previousValue = null;
    currentValue = null;
  } else if (category === "lender") {
    domain = "lender";
    changeType = "LENDER_STAGE_CHANGED";
  } else {
    const activityType = inferActivityChangeType(titleLower);
    if (activityType) {
      domain = "activity";
      changeType = activityType;
      previousValue = stringField(payload, ["previousIdleDays", "previousValue"]);
      currentValue = stringField(payload, ["idleDays", "currentValue", "newValue"]);
    }
  }

  if (!changeType) return null;

  return {
    changeId: `ear:${event.id}`,
    entityKind: resolveEntityKind(event),
    entityId: resolveEntityId(event),
    opportunityId: event.opportunityId,
    dealId: event.dealId,
    opportunityNumber: refs?.opportunityNumber ?? null,
    dealNumber: refs?.dealNumber ?? null,
    domain,
    changeType,
    title: item.title || event.title,
    previousValue: previousValue ?? null,
    currentValue: currentValue ?? null,
    changedAt: event.occurredAt,
    source: "enterprise_activity_registry",
    sourceEntityId: event.id,
    observedAt,
    availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    significance: significanceFor(changeType, true),
  };
}

export function mapEteTaskToChangeRecords(
  task: EteTask,
  observedAt: string,
  period: ChanakyaChangeIntelligenceContext["period"],
  refs?: {
    opportunityId?: string | null;
    dealId?: string | null;
    opportunityNumber?: string | null;
    dealNumber?: string | null;
  },
): ChanakyaChangeRecord[] {
  const rows: ChanakyaChangeRecord[] = [];
  const entityKind =
    task.dealId ? "deal" : task.entityKind === "Opportunity" ? "opportunity" : "task";
  const entityId = task.dealId || task.entityId || task.fileId || task.id;
  const opportunityId =
    refs?.opportunityId ??
    (task.entityKind === "Opportunity" ? task.entityId : null);

  if (task.createdOn && isTimestampInPeriod(task.createdOn, period)) {
    rows.push({
      changeId: `ete:created:${task.id}`,
      entityKind,
      entityId,
      opportunityId: refs?.opportunityId ?? opportunityId,
      dealId: refs?.dealId ?? task.dealId ?? null,
      opportunityNumber: refs?.opportunityNumber ?? null,
      dealNumber: refs?.dealNumber ?? null,
      domain: "tasks",
      changeType: "TASK_CREATED",
      title: task.title || task.description || "Task created",
      previousValue: null,
      currentValue: task.status ?? null,
      changedAt: task.createdOn,
      source: "enterprise_task_engine",
      sourceEntityId: task.id,
      observedAt,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      significance: "informational",
    });
  }

  if (task.completedAt && isTimestampInPeriod(task.completedAt, period)) {
    rows.push({
      changeId: `ete:completed:${task.id}`,
      entityKind,
      entityId,
      opportunityId: refs?.opportunityId ?? opportunityId,
      dealId: refs?.dealId ?? task.dealId ?? null,
      opportunityNumber: refs?.opportunityNumber ?? null,
      dealNumber: refs?.dealNumber ?? null,
      domain: "tasks",
      changeType: "TASK_COMPLETED",
      title: task.title || task.description || "Task completed",
      previousValue: null,
      currentValue: task.status ?? "completed",
      changedAt: task.completedAt,
      source: "enterprise_task_engine",
      sourceEntityId: task.id,
      observedAt,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      significance: "informational",
    });
  }

  if (
    task.dueOn &&
    !task.completedAt &&
    isTimestampInPeriod(task.dueOn, period) &&
    new Date(task.dueOn).getTime() < new Date(period.endAt).getTime()
  ) {
    rows.push({
      changeId: `ete:overdue:${task.id}`,
      entityKind,
      entityId,
      opportunityId: refs?.opportunityId ?? opportunityId,
      dealId: refs?.dealId ?? task.dealId ?? null,
      opportunityNumber: refs?.opportunityNumber ?? null,
      dealNumber: refs?.dealNumber ?? null,
      domain: "tasks",
      changeType: "TASK_BECAME_OVERDUE",
      title: task.title || task.description || "Task became overdue",
      previousValue: null,
      currentValue: task.dueOn,
      changedAt: task.dueOn,
      source: "enterprise_task_engine",
      sourceEntityId: task.id,
      observedAt,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      significance: "meaningful",
    });
  }

  return rows;
}

export function mapSdeExceptionToChangeRecords(
  exception: SdeControlledException,
  observedAt: string,
  period: ChanakyaChangeIntelligenceContext["period"],
): ChanakyaChangeRecord[] {
  const rows: ChanakyaChangeRecord[] = [];

  if (
    exception.recordedAt &&
    isTimestampInPeriod(exception.recordedAt, period)
  ) {
    rows.push({
      changeId: `sde:opened:${exception.id}`,
      entityKind: "enterprise",
      entityId: exception.transactionId || exception.id,
      opportunityId: null,
      dealId: exception.transactionId,
      domain: "system_exception",
      changeType: "SYSTEM_EXCEPTION_OPENED",
      title: exception.title,
      previousValue: null,
      currentValue: exception.status,
      changedAt: exception.recordedAt,
      source: "system_driven_enterprise",
      sourceEntityId: exception.id,
      observedAt,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      significance: "meaningful",
    });
  }

  if (
    exception.resolvedAt &&
    isTimestampInPeriod(exception.resolvedAt, period)
  ) {
    rows.push({
      changeId: `sde:resolved:${exception.id}`,
      entityKind: "enterprise",
      entityId: exception.transactionId || exception.id,
      opportunityId: null,
      dealId: exception.transactionId,
      domain: "system_exception",
      changeType: "SYSTEM_EXCEPTION_RESOLVED",
      title: exception.title,
      previousValue: exception.status,
      currentValue: "resolved",
      changedAt: exception.resolvedAt,
      source: "system_driven_enterprise",
      sourceEntityId: exception.id,
      observedAt,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      significance: "meaningful",
    });
  }

  return rows;
}

export type AccountingChangeInput = {
  invoiceId: string;
  invoiceNumber: string | null;
  documentStatus: string;
  raisedAt: string;
  updatedAt: string;
  dealId: string | null;
  opportunityId: string | null;
  dealNumber?: string | null;
  payment?: {
    id: string;
    status: string;
    amount: number;
    receivedAt: string;
    paymentReference?: string | null;
    reconciliationStatus?: string | null;
  };
  creditNote?: {
    id: string;
    creditNoteNumber: string | null;
    status: string;
    creditNoteAmount: number;
    issuedAt: string;
  };
};

export function mapAccountingEvidenceToChangeRecords(
  input: AccountingChangeInput,
  observedAt: string,
  period: ChanakyaChangeIntelligenceContext["period"],
  refs?: {
    opportunityNumber?: string | null;
    dealNumber?: string | null;
  },
): ChanakyaChangeRecord[] {
  const rows: ChanakyaChangeRecord[] = [];
  const entityKind = input.dealId ? "deal" : "opportunity";
  const entityId = input.dealId || input.opportunityId || input.invoiceId;

  if (isTimestampInPeriod(input.raisedAt, period)) {
    rows.push({
      changeId: `acct:invoice_raised:${input.invoiceId}`,
      entityKind,
      entityId,
      opportunityId: input.opportunityId,
      dealId: input.dealId,
      opportunityNumber: refs?.opportunityNumber ?? null,
      dealNumber: refs?.dealNumber ?? input.dealNumber ?? null,
      domain: "invoice",
      changeType: "INVOICE_RAISED",
      title: `Invoice ${input.invoiceNumber || input.invoiceId} raised`,
      previousValue: null,
      currentValue: input.documentStatus,
      changedAt: input.raisedAt,
      source: "enterprise_accounting_invoice",
      sourceEntityId: input.invoiceId,
      observedAt,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      significance: "meaningful",
    });
  }

  if (
    input.documentStatus === "shared" &&
    isTimestampInPeriod(input.updatedAt, period)
  ) {
    rows.push({
      changeId: `acct:invoice_shared:${input.invoiceId}`,
      entityKind,
      entityId,
      opportunityId: input.opportunityId,
      dealId: input.dealId,
      opportunityNumber: refs?.opportunityNumber ?? null,
      dealNumber: refs?.dealNumber ?? input.dealNumber ?? null,
      domain: "invoice",
      changeType: "INVOICE_SHARED",
      title: `Invoice ${input.invoiceNumber || input.invoiceId} shared`,
      previousValue: null,
      currentValue: "shared",
      changedAt: input.updatedAt,
      source: "enterprise_accounting_invoice",
      sourceEntityId: input.invoiceId,
      observedAt,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      significance: "meaningful",
    });
  }

  if (input.payment && isTimestampInPeriod(input.payment.receivedAt, period)) {
    rows.push({
      changeId: `acct:payment:${input.payment.id}`,
      entityKind,
      entityId,
      opportunityId: input.opportunityId,
      dealId: input.dealId,
      opportunityNumber: refs?.opportunityNumber ?? null,
      dealNumber: refs?.dealNumber ?? input.dealNumber ?? null,
      domain: "payment",
      changeType: "PAYMENT_RECEIVED",
      title: `Payment received against invoice ${input.invoiceNumber || input.invoiceId}`,
      previousValue: null,
      currentValue: String(input.payment.amount),
      changedAt: input.payment.receivedAt,
      source: "enterprise_accounting_payment",
      sourceEntityId: input.payment.id,
      observedAt,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      significance: "meaningful",
    });

    if (input.payment.reconciliationStatus) {
      rows.push({
        changeId: `acct:payment_status:${input.payment.id}`,
        entityKind,
        entityId,
        opportunityId: input.opportunityId,
        dealId: input.dealId,
        opportunityNumber: refs?.opportunityNumber ?? null,
        dealNumber: refs?.dealNumber ?? input.dealNumber ?? null,
        domain: "payment",
        changeType: "PAYMENT_STATUS_CHANGED",
        title: `Payment reconciliation status updated for invoice ${input.invoiceNumber || input.invoiceId}`,
        previousValue: null,
        currentValue: input.payment.reconciliationStatus,
        changedAt: input.payment.receivedAt,
        source: "enterprise_accounting_payment",
        sourceEntityId: input.payment.id,
        observedAt,
        availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
        significance: "informational",
      });
    }
  }

  if (input.creditNote && isTimestampInPeriod(input.creditNote.issuedAt, period)) {
    rows.push({
      changeId: `acct:credit_note:${input.creditNote.id}`,
      entityKind,
      entityId,
      opportunityId: input.opportunityId,
      dealId: input.dealId,
      opportunityNumber: refs?.opportunityNumber ?? null,
      dealNumber: refs?.dealNumber ?? input.dealNumber ?? null,
      domain: "accounting",
      changeType: "CREDIT_NOTE_CREATED",
      title: `Credit note ${input.creditNote.creditNoteNumber || input.creditNote.id} issued`,
      previousValue: null,
      currentValue: String(input.creditNote.creditNoteAmount),
      changedAt: input.creditNote.issuedAt,
      source: "enterprise_accounting_credit_note",
      sourceEntityId: input.creditNote.id,
      observedAt,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      significance: "meaningful",
    });
  }

  return rows;
}

export function dedupeChangeRecords(
  changes: ChanakyaChangeRecord[],
): ChanakyaChangeRecord[] {
  const map = new Map<string, ChanakyaChangeRecord>();
  for (const row of changes) {
    map.set(row.changeId, row);
  }
  return [...map.values()].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
  );
}

export function buildChangeDomainBreakdown(
  changes: ChanakyaChangeRecord[],
): Partial<Record<ChanakyaChangeDomain, ChanakyaChangeRecord[]>> {
  const breakdown: Partial<Record<ChanakyaChangeDomain, ChanakyaChangeRecord[]>> =
    {};
  for (const change of changes) {
    const bucket = breakdown[change.domain] ?? [];
    bucket.push(change);
    breakdown[change.domain] = bucket;
  }
  return breakdown;
}

export function deriveAttentionChangesFromChanges(
  changes: ChanakyaChangeRecord[],
  observedAt: string,
): ChanakyaAttentionChangeRecord[] {
  const rows: ChanakyaAttentionChangeRecord[] = [];

  for (const change of changes) {
    if (change.changeType === "POST_DISBURSEMENT_CONFIRMATION_RECEIVED") {
      rows.push({
        changeId: `attention:${change.changeId}`,
        domain: "post_disbursement",
        changeType: change.changeType,
        statement:
          "Post-disbursement confirmation received — pending confirmation attention may reduce where Radar already reflects receipt.",
        previousAttention: null,
        currentAttention: "confirmation_received",
        changedAt: change.changedAt,
        source: change.source,
        availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      });
    } else if (change.changeType === "POST_DISBURSEMENT_CONFIRMATION_PENDING") {
      rows.push({
        changeId: `attention:${change.changeId}`,
        domain: "post_disbursement",
        changeType: change.changeType,
        statement:
          "Post-disbursement confirmation became pending — existing Radar/SDE attention may apply.",
        previousAttention: null,
        currentAttention: "confirmation_pending",
        changedAt: change.changedAt,
        source: change.source,
        availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      });
    } else if (change.changeType === "ACTIVITY_DETERIORATED") {
      rows.push({
        changeId: `attention:${change.changeId}`,
        domain: "activity",
        changeType: change.changeType,
        statement: change.title,
        previousAttention: change.previousValue,
        currentAttention: change.currentValue,
        changedAt: change.changedAt,
        source: change.source,
        availability:
          change.previousValue || change.currentValue
            ? CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
            : CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      });
    } else if (change.changeType === "SYSTEM_EXCEPTION_OPENED") {
      rows.push({
        changeId: `attention:${change.changeId}`,
        domain: "sla_exception",
        changeType: change.changeType,
        statement: `Controlled exception opened: ${change.title}`,
        previousAttention: null,
        currentAttention: change.currentValue,
        changedAt: change.changedAt,
        source: change.source,
        availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      });
    } else if (change.changeType === "SYSTEM_EXCEPTION_RESOLVED") {
      rows.push({
        changeId: `attention:${change.changeId}`,
        domain: "sla_exception",
        changeType: change.changeType,
        statement: `Controlled exception resolved: ${change.title}`,
        previousAttention: change.previousValue,
        currentAttention: "resolved",
        changedAt: change.changedAt,
        source: change.source,
        availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      });
    }
  }

  return rows;
}

export function buildHumanReadableChangeSummary(input: {
  period: ChanakyaChangeIntelligenceContext["period"];
  changes: ChanakyaChangeRecord[];
  scopeLabel?: string | null;
}): string {
  const meaningful = input.changes.filter((c) => c.significance === "meaningful");
  const pool = meaningful.length > 0 ? meaningful : input.changes;

  if (pool.length === 0) {
    return `${input.period.label}: no operational changes with available evidence${
      input.scopeLabel ? ` for ${input.scopeLabel}` : ""
    }.`;
  }

  const stageCount = pool.filter(
    (c) => c.changeType === "STAGE_CHANGED" || c.changeType === "LENDER_STAGE_CHANGED",
  ).length;
  const docCount = pool.filter((c) => c.domain === "documents").length;
  const paymentCount = pool.filter(
    (c) => c.changeType === "PAYMENT_RECEIVED",
  ).length;
  const postDisbCount = pool.filter(
    (c) => c.domain === "post_disbursement",
  ).length;
  const exceptionCount = pool.filter(
    (c) => c.domain === "system_exception",
  ).length;

  const entityKeys = new Set(
    pool.map((c) => c.opportunityNumber || c.dealNumber || c.entityId),
  );

  const bullets: string[] = [];
  if (stageCount) bullets.push(`${stageCount} stage movement(s)`);
  if (postDisbCount) bullets.push(`${postDisbCount} post-disbursement update(s)`);
  if (docCount) bullets.push(`${docCount} document change(s)`);
  if (paymentCount) bullets.push(`${paymentCount} payment(s) recorded`);
  if (exceptionCount) bullets.push(`${exceptionCount} system exception change(s)`);

  const lead = pool[0]!;
  const leadRef =
    lead.opportunityNumber || lead.dealNumber || lead.entityId;

  let summary = `${input.period.label}, ${pool.length} meaningful change(s) across ${entityKeys.size} transaction(s)`;
  if (input.scopeLabel) summary += ` (${input.scopeLabel})`;
  summary += ".";
  if (bullets.length) summary += ` ${bullets.map((b) => `• ${b}`).join(" ")}`;
  if (leadRef) {
    summary += ` The most recent meaningful change is ${leadRef}: ${lead.title}.`;
  }
  return summary;
}

export function assembleChangeIntelligenceContext(input: {
  period: ChanakyaChangeIntelligenceContext["period"];
  changes: ChanakyaChangeRecord[];
  observedAt: string;
  scopeLabel?: string | null;
  limitations?: string[];
  portfolioMode?: boolean;
}): ChanakyaChangeIntelligenceContext {
  let changes = dedupeChangeRecords(input.changes);

  if (input.portfolioMode) {
    const meaningful = changes.filter((c) => c.significance === "meaningful");
    if (meaningful.length > 0) changes = meaningful;
  }

  const attentionChanges = deriveAttentionChangesFromChanges(
    changes,
    input.observedAt,
  );

  const availability =
    changes.length > 0
      ? CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
      : CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE;

  return {
    availability,
    readOnly: true,
    period: input.period,
    summary: buildHumanReadableChangeSummary({
      period: input.period,
      changes,
      scopeLabel: input.scopeLabel,
    }),
    changes,
    attentionChanges,
    domainBreakdown: buildChangeDomainBreakdown(changes),
    provenance: [
      "enterprise_activity_registry",
      "enterprise_task_engine",
      "enterprise_transaction_documents",
      "enterprise_accounting_invoice",
      "enterprise_accounting_payment",
      "enterprise_accounting_credit_note",
      "post_disbursement_confirmation",
      "system_driven_enterprise",
      "chanakya_radar_attention_evidence",
    ],
    limitations: input.limitations ?? [
      "Change intelligence is read-only and evidence-first — previous/current values appear only when SSOT provides them.",
      "Cross-period Radar attention deltas require historical snapshots — not independently recomputed here.",
    ],
  };
}

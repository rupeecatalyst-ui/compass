/**
 * System-Driven Enterprise runtime store
 * Controlled exceptions + operational events → Mission Control feeds
 */

import {
  SDE_DEFAULT_SEVERITY,
  SDE_PRINCIPLES_VERSION,
  SDE_STORAGE_KEY,
} from "@/constants/system-driven-enterprise";
import { isDemoSeedEnabled } from "@/lib/demo-seed";
import type {
  SdeAssistanceHint,
  SdeControlledException,
  SdeEventCode,
  SdeGuidanceLevel,
  SdeOperationalCategory,
  SdeOperationalEvent,
  SdeSeverity,
  SdeSnapshot,
} from "@/types/system-driven-enterprise";

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function seed(): SdeSnapshot {
  const t0 = "2026-07-17T10:00:00.000Z";
  const t1 = "2026-07-17T14:30:00.000Z";
  const t2 = "2026-07-18T08:15:00.000Z";

  const ex1: SdeControlledException = {
    id: "sde_ex_doc_continue",
    title: "Continue with incomplete document pack",
    category: "documents",
    status: "monitoring",
    responsibleUserId: "usr_rm_anjali",
    responsibleUserName: "Anjali Mehta",
    recordedAt: t1,
    resolvedAt: null,
    workflowId: "wf_loan_origination",
    workflowLabel: "Loan Origination",
    transactionId: "loan_demo_1",
    transactionLabel: "HL-2026-0142",
    reason: "Customer visiting branch tomorrow with originals; commercial timeline at risk.",
    slaMonitoring: true,
    slaDueAt: "2026-07-19T18:00:00.000Z",
    guidanceLevel: "warn",
    blockAuthority: "none",
    visibleUntilResolved: true,
  };

  const events: SdeOperationalEvent[] = [
    {
      id: "sde_ev_seed_1",
      code: "EXCEPTION_RECORDED",
      severity: "medium",
      category: "documents",
      title: "Controlled exception — incomplete documents",
      summary:
        "User continued despite missing mandatory KYC scan. Exception recorded; SLA monitoring started.",
      at: t1,
      actorUserId: "usr_rm_anjali",
      actorUserName: "Anjali Mehta",
      exceptionId: ex1.id,
      workflowId: "wf_loan_origination",
      transactionId: "loan_demo_1",
      recommendedAction: "Obtain originals within SLA; resolve exception on upload.",
      missionControlVisible: true,
    },
    {
      id: "sde_ev_seed_2",
      code: "SLA_WARNING",
      severity: "high",
      category: "sla",
      title: "Credit review approaching SLA",
      summary: "Credit workbench queue item is within warning threshold of stage SLA.",
      at: t2,
      actorUserId: null,
      actorUserName: "System",
      exceptionId: null,
      workflowId: "wf_credit_review",
      transactionId: "loan_demo_2",
      recommendedAction: "Assign credit analyst or escalate to Credit Head.",
      missionControlVisible: true,
    },
    {
      id: "sde_ev_seed_3",
      code: "PENDING_APPROVAL",
      severity: "medium",
      category: "approvals",
      title: "Deviation approval pending",
      summary: "Policy deviation awaiting Management approval — visible until resolved.",
      at: t0,
      actorUserId: "usr_mgr_vikram",
      actorUserName: "Vikram Shah",
      exceptionId: null,
      workflowId: "wf_credit_review",
      transactionId: "loan_demo_1",
      recommendedAction: "Complete approval or return with conditions.",
      missionControlVisible: true,
    },
    {
      id: "sde_ev_seed_4",
      code: "GUIDANCE_EMITTED",
      severity: "info",
      category: "guidance",
      title: "Next action recommended",
      summary: "Chanakya recommends completing income documents before lender submit.",
      at: t2,
      actorUserId: null,
      actorUserName: "Chanakya",
      exceptionId: null,
      workflowId: "wf_loan_origination",
      transactionId: "loan_demo_1",
      recommendedAction: "Upload salary slips / ITR as advised.",
      missionControlVisible: true,
    },
  ];

  const assistance: SdeAssistanceHint[] = [
    {
      id: "sde_hint_1",
      kind: "next_action",
      title: "Complete KYC originals",
      detail: "Exception is open — resolve by uploading verified KYC within SLA.",
      at: t1,
      transactionId: "loan_demo_1",
      acknowledged: false,
    },
    {
      id: "sde_hint_2",
      kind: "risk_warning",
      title: "Credit SLA at risk",
      detail: "Two files in credit queue are inside the warning band.",
      at: t2,
      transactionId: null,
      acknowledged: false,
    },
  ];

  return {
    schemaVersion: 1,
    principlesVersion: SDE_PRINCIPLES_VERSION,
    exceptions: [ex1],
    events,
    assistance,
  };
}

function emptySnapshot(): SdeSnapshot {
  return {
    schemaVersion: 1,
    principlesVersion: SDE_PRINCIPLES_VERSION,
    exceptions: [],
    events: [],
    assistance: [],
  };
}

function empty(): SdeSnapshot {
  if (!isDemoSeedEnabled()) return emptySnapshot();
  return seed();
}

function read(): SdeSnapshot {
  if (typeof window === "undefined") return empty();
  if (!isDemoSeedEnabled()) {
    try {
      localStorage.removeItem(SDE_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return emptySnapshot();
  }
  try {
    const raw = localStorage.getItem(SDE_STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as SdeSnapshot;
    if (!parsed?.events) return empty();
    return {
      schemaVersion: 1,
      principlesVersion: SDE_PRINCIPLES_VERSION,
      exceptions: parsed.exceptions ?? [],
      events: parsed.events ?? [],
      assistance: parsed.assistance ?? [],
    };
  } catch {
    return empty();
  }
}

function write(snap: SdeSnapshot) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SDE_STORAGE_KEY, JSON.stringify(snap));
}

export function getSdeSnapshot(): SdeSnapshot {
  return read();
}

export function listSdeExceptions(opts?: {
  openOnly?: boolean;
  transactionId?: string;
}): SdeControlledException[] {
  let rows = read().exceptions;
  if (opts?.openOnly) {
    rows = rows.filter((e) => e.status === "open" || e.status === "monitoring" || e.status === "escalated");
  }
  if (opts?.transactionId) {
    rows = rows.filter((e) => e.transactionId === opts.transactionId);
  }
  return [...rows].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

export function listSdeEvents(opts?: {
  missionControlOnly?: boolean;
  limit?: number;
}): SdeOperationalEvent[] {
  let rows = read().events;
  if (opts?.missionControlOnly) {
    rows = rows.filter((e) => e.missionControlVisible);
  }
  rows = [...rows].sort((a, b) => b.at.localeCompare(a.at));
  if (opts?.limit) rows = rows.slice(0, opts.limit);
  return rows;
}

export function listSdeAssistance(unacknowledgedOnly = false): SdeAssistanceHint[] {
  let rows = read().assistance;
  if (unacknowledgedOnly) rows = rows.filter((a) => !a.acknowledged);
  return [...rows].sort((a, b) => b.at.localeCompare(a.at));
}

export function emitSdeEvent(input: {
  code: SdeEventCode;
  title: string;
  summary: string;
  category: SdeOperationalCategory;
  severity?: SdeSeverity;
  actorUserId?: string | null;
  actorUserName?: string | null;
  exceptionId?: string | null;
  workflowId?: string | null;
  transactionId?: string | null;
  recommendedAction?: string | null;
  missionControlVisible?: boolean;
  meta?: Record<string, string>;
}): SdeOperationalEvent {
  const snap = read();
  const event: SdeOperationalEvent = {
    id: newId("sde_ev"),
    code: input.code,
    severity: input.severity ?? SDE_DEFAULT_SEVERITY[input.code] ?? "medium",
    category: input.category,
    title: input.title,
    summary: input.summary,
    at: new Date().toISOString(),
    actorUserId: input.actorUserId ?? null,
    actorUserName: input.actorUserName ?? null,
    exceptionId: input.exceptionId ?? null,
    workflowId: input.workflowId ?? null,
    transactionId: input.transactionId ?? null,
    recommendedAction: input.recommendedAction ?? null,
    missionControlVisible: input.missionControlVisible ?? true,
    meta: input.meta,
  };
  snap.events.unshift(event);
  write(snap);
  return event;
}

/**
 * Record a controlled exception — continue work, remain visible until resolved.
 */
export function recordControlledException(input: {
  title: string;
  category: SdeOperationalCategory;
  responsibleUserId: string;
  responsibleUserName: string;
  reason?: string | null;
  workflowId?: string | null;
  workflowLabel?: string | null;
  transactionId?: string | null;
  transactionLabel?: string | null;
  slaMonitoring?: boolean;
  slaDueAt?: string | null;
  guidanceLevel?: SdeGuidanceLevel;
}): SdeControlledException {
  const snap = read();
  const now = new Date().toISOString();
  const exception: SdeControlledException = {
    id: newId("sde_ex"),
    title: input.title,
    category: input.category,
    status: input.slaMonitoring === false ? "open" : "monitoring",
    responsibleUserId: input.responsibleUserId,
    responsibleUserName: input.responsibleUserName,
    recordedAt: now,
    resolvedAt: null,
    workflowId: input.workflowId ?? null,
    workflowLabel: input.workflowLabel ?? null,
    transactionId: input.transactionId ?? null,
    transactionLabel: input.transactionLabel ?? null,
    reason: input.reason ?? null,
    slaMonitoring: input.slaMonitoring ?? true,
    slaDueAt: input.slaDueAt ?? null,
    guidanceLevel: input.guidanceLevel ?? "warn",
    blockAuthority: "none",
    visibleUntilResolved: true,
  };
  snap.exceptions.unshift(exception);
  write(snap);

  emitSdeEvent({
    code: "EXCEPTION_RECORDED",
    title: `Controlled exception — ${exception.title}`,
    summary: exception.reason ?? exception.title,
    category: exception.category,
    actorUserId: exception.responsibleUserId,
    actorUserName: exception.responsibleUserName,
    exceptionId: exception.id,
    workflowId: exception.workflowId,
    transactionId: exception.transactionId,
    recommendedAction: "Resolve exception; keep visible until closed.",
  });

  if (exception.slaMonitoring) {
    emitSdeEvent({
      code: "SLA_WARNING",
      title: "SLA monitoring started for exception",
      summary: `Monitoring exception ${exception.id}${exception.slaDueAt ? ` until ${exception.slaDueAt}` : ""}.`,
      category: "sla",
      actorUserId: null,
      actorUserName: "System",
      exceptionId: exception.id,
      workflowId: exception.workflowId,
      transactionId: exception.transactionId,
      recommendedAction: "Track until documents / steps complete.",
    });
  }

  return exception;
}

export function resolveControlledException(
  exceptionId: string,
  actor: { id: string; name: string },
): SdeControlledException | null {
  const snap = read();
  const idx = snap.exceptions.findIndex((e) => e.id === exceptionId);
  if (idx < 0) return null;
  const current = snap.exceptions[idx]!;
  const updated: SdeControlledException = {
    ...current,
    status: "resolved",
    resolvedAt: new Date().toISOString(),
    visibleUntilResolved: false,
  };
  snap.exceptions[idx] = updated;
  write(snap);
  emitSdeEvent({
    code: "EXCEPTION_RESOLVED",
    title: `Exception resolved — ${updated.title}`,
    summary: `Resolved by ${actor.name}`,
    category: updated.category,
    actorUserId: actor.id,
    actorUserName: actor.name,
    exceptionId: updated.id,
    workflowId: updated.workflowId,
    transactionId: updated.transactionId,
    recommendedAction: null,
  });
  return updated;
}

export function pushSdeAssistance(
  hint: Omit<SdeAssistanceHint, "id" | "at" | "acknowledged"> & {
    acknowledged?: boolean;
  },
): SdeAssistanceHint {
  const snap = read();
  const row: SdeAssistanceHint = {
    id: newId("sde_hint"),
    kind: hint.kind,
    title: hint.title,
    detail: hint.detail,
    at: new Date().toISOString(),
    transactionId: hint.transactionId,
    acknowledged: hint.acknowledged ?? false,
  };
  snap.assistance.unshift(row);
  write(snap);
  return row;
}

/** Mission Control feed — open exceptions + recent events */
export function getSdeMissionControlFeed(limit = 20) {
  return {
    openExceptions: listSdeExceptions({ openOnly: true }),
    events: listSdeEvents({ missionControlOnly: true, limit }),
    assistance: listSdeAssistance(true),
    principlesVersion: SDE_PRINCIPLES_VERSION,
  };
}

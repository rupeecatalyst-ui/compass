/**
 * CO-SPRINT-112 — Loan Workspace Intelligence (entity-scoped, event-driven).
 *
 * HARD RULE: Messages are derived only from the open LoanFile.
 * Never load other loan files, Radar aggregates, team KPIs, or org-wide counts.
 */

import { normalizeLenderCaseStage } from "@/constants/lender-pipeline";
import type { LoanFile, LoanLenderExecution } from "@/types/catalyst-one";
import type {
  WorkspaceIntelligenceMessage,
  WorkspaceIntelligencePriority,
} from "@/types/workspace-intelligence";
import { WORKSPACE_INTELLIGENCE_PRIORITY_WEIGHT } from "@/types/workspace-intelligence";

function daysSince(iso?: string): number {
  if (!iso) return 999;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 999;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

function isToday(iso?: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

function entityLabel(loan: LoanFile): string {
  const company = loan.businessDetails?.companyName?.trim();
  if (company) return company;
  return (loan.customerName || "This file").trim();
}

function lenderName(c: LoanLenderExecution): string {
  return (c.lender || c.lenderRef || "Lender").trim();
}

function msg(
  loan: LoanFile,
  partial: Omit<WorkspaceIntelligenceMessage, "entityId" | "entityLabel" | "scope">,
): WorkspaceIntelligenceMessage {
  return {
    ...partial,
    entityId: loan.id,
    entityLabel: entityLabel(loan),
    scope: "workspace_entity",
  };
}

function priorityRank(p: WorkspaceIntelligencePriority): number {
  if (p === "critical") return 0;
  if (p === "action") return 1;
  return 2;
}

/**
 * Expand by priority weight so critical messages appear more often in the ticker.
 */
function prioritizeAndLoop(
  items: WorkspaceIntelligenceMessage[],
  loan: LoanFile,
): WorkspaceIntelligenceMessage[] {
  const sorted = [...items].sort(
    (a, b) => priorityRank(a.priority) - priorityRank(b.priority),
  );

  if (sorted.length === 0) {
    const recommendation = msg(loan, {
      id: "rec-next",
      text: `Recommended next action for ${entityLabel(loan)}: confirm document readiness and advance the primary lender.`,
      tone: "info",
      priority: "informational",
    });
    return [recommendation, { ...recommendation, id: "rec-next-loop" }];
  }

  const weighted: WorkspaceIntelligenceMessage[] = [];
  for (const item of sorted) {
    const weight = WORKSPACE_INTELLIGENCE_PRIORITY_WEIGHT[item.priority];
    for (let i = 0; i < weight; i += 1) {
      weighted.push(i === 0 ? item : { ...item, id: `${item.id}-w${i}` });
    }
  }

  return [
    ...weighted,
    ...weighted.map((i) => ({ ...i, id: `${i.id}-loop` })),
  ];
}

/**
 * Build Workspace Intelligence for the open loan entity only.
 * Event-driven — no filler; falls back to one entity recommendation when quiet.
 */
export function buildLoanWorkspaceIntelligenceMessages(
  loan: LoanFile,
): WorkspaceIntelligenceMessage[] {
  const items: WorkspaceIntelligenceMessage[] = [];
  const label = entityLabel(loan);
  const cases = (loan.lenders ?? []).filter((c) => c.status !== "closed");
  const docs = loan.documents ?? [];
  const tasks = loan.tasks ?? [];
  const timeline = loan.timeline ?? [];

  const primary =
    cases.find((c) => c.isPrimary) ??
    [...cases].sort((a, b) => {
      const rank: Record<string, number> = {
        very_high: 5,
        high: 4,
        medium: 3,
        low: 2,
        very_low: 1,
        rejected: 0,
        withdrawn: 0,
      };
      return (rank[b.probability ?? ""] ?? 0) - (rank[a.probability ?? ""] ?? 0);
    })[0];

  // ── Priority 1 — Critical ──────────────────────────────────────────────
  if (loan.isDelayed) {
    items.push(
      msg(loan, {
        id: "sla-file",
        text: `SLA status: ${label} has crossed an operational SLA — prioritise next action.`,
        tone: "danger",
        priority: "critical",
      }),
    );
  }

  const rejected = cases.filter((c) => {
    const stage = normalizeLenderCaseStage(c.caseStage);
    return (
      c.probability === "rejected" ||
      (stage === "lost" && c.lostReason === "rejected") ||
      (stage === "lost" && !c.lostReason)
    );
  });
  for (const c of rejected.slice(0, 2)) {
    items.push(
      msg(loan, {
        id: `rej-${c.id}`,
        text:
          c.lostReason === "rejected" || c.probability === "rejected"
            ? `Approval rejected by ${lenderName(c)} for ${label}.`
            : `Lender case lost with ${lenderName(c)} for ${label}.`,
        tone: "danger",
        priority: "critical",
        sourceEventId: c.id,
      }),
    );
  }

  const loginSla = cases.filter((c) => {
    const stage = normalizeLenderCaseStage(c.caseStage);
    if (stage !== "prelogin" && stage !== "identified") return false;
    return daysSince(c.updatedAt || c.createdAt) >= 5;
  });
  for (const c of loginSla.slice(0, 2)) {
    items.push(
      msg(loan, {
        id: `login-sla-${c.id}`,
        text: `Login delayed: ${lenderName(c)} has crossed expected login turnaround for ${label}.`,
        tone: "danger",
        priority: "critical",
        sourceEventId: c.id,
      }),
    );
  }

  const missingRequired = docs.filter(
    (d) => d.status === "rejected" || d.status === "requested",
  );
  if (missingRequired.length > 0) {
    const sample = missingRequired[0]!;
    const docLabel = sample.name || sample.category || "required documents";
    items.push(
      msg(loan, {
        id: "doc-required",
        text: `Required document missing for ${label}: ${String(docLabel)}.`,
        tone: "danger",
        priority: "critical",
        sourceEventId: sample.id,
      }),
    );
  }

  // ── Priority 2 — Action required ───────────────────────────────────────
  const pendingDocs = docs.filter((d) => d.status === "pending");
  if (pendingDocs.length > 0) {
    items.push(
      msg(loan, {
        id: "doc-pending",
        text:
          pendingDocs.length === 1
            ? `Customer documents pending for ${label}: ${pendingDocs[0]!.name || "document"}.`
            : `${pendingDocs.length} customer documents pending for ${label}.`,
        tone: "warning",
        priority: "action",
      }),
    );
    if (primary) {
      items.push(
        msg(loan, {
          id: `doc-lender-${primary.id}`,
          text: `Lender follow-up required: ${lenderName(primary)} awaits documents on ${label}.`,
          tone: "warning",
          priority: "action",
          sourceEventId: primary.id,
        }),
      );
    }
  }

  const loggedIdle = cases.filter((c) => {
    if (normalizeLenderCaseStage(c.caseStage) !== "logged_in_wip") return false;
    return daysSince(c.updatedAt || c.createdAt) >= 7;
  });
  for (const c of loggedIdle.slice(0, 2)) {
    items.push(
      msg(loan, {
        id: `fu-${c.id}`,
        text: `Lender follow-up required with ${lenderName(c)} for ${label}.`,
        tone: "warning",
        priority: "action",
        sourceEventId: c.id,
      }),
    );
  }

  const openTasks = tasks.filter((t) => !t.completed && t.status !== "completed");
  const callbackTasks = openTasks.filter((t) => {
    const title = (t.title || "").toLowerCase();
    return title.includes("callback") || title.includes("call back") || title.includes("call-back");
  });
  for (const t of callbackTasks.slice(0, 2)) {
    items.push(
      msg(loan, {
        id: `cb-${t.id}`,
        text: `Customer callback pending for ${label}${t.dueDate && isToday(t.dueDate) ? " (due today)" : ""}.`,
        tone: "warning",
        priority: "action",
        sourceEventId: t.id,
      }),
    );
  }

  const dueToday = openTasks.filter((t) => t.dueDate && isToday(t.dueDate));
  if (dueToday.length > 0 && callbackTasks.length === 0) {
    items.push(
      msg(loan, {
        id: "tasks-today",
        text: `${dueToday.length} follow-up${dueToday.length === 1 ? "" : "s"} due today on ${label}.`,
        tone: "warning",
        priority: "action",
      }),
    );
  }

  const awaitingLender = cases.filter((c) => {
    const s = normalizeLenderCaseStage(c.caseStage);
    return s === "logged_in_wip" || s === "soft_approved";
  });
  if (awaitingLender.length > 0 && loggedIdle.length === 0) {
    const c = awaitingLender[0]!;
    items.push(
      msg(loan, {
        id: `await-${c.id}`,
        text: `Lender response pending from ${lenderName(c)} for ${label}.`,
        tone: "warning",
        priority: "action",
        sourceEventId: c.id,
      }),
    );
  }

  // ── Priority 3 — Informational ─────────────────────────────────────────
  const softApproved = cases.filter(
    (c) => normalizeLenderCaseStage(c.caseStage) === "soft_approved",
  );
  for (const c of softApproved.slice(0, 2)) {
    items.push(
      msg(loan, {
        id: `sa-${c.id}`,
        text: `Approval received from ${lenderName(c)} (soft approval) for ${label}.`,
        tone: "success",
        priority: "informational",
        sourceEventId: c.id,
      }),
    );
  }

  const finalApproved = cases.filter(
    (c) => normalizeLenderCaseStage(c.caseStage) === "final_approved",
  );
  for (const c of finalApproved.slice(0, 2)) {
    items.push(
      msg(loan, {
        id: `fa-${c.id}`,
        text: `Approval received: ${lenderName(c)} moved to Final Approval for ${label}.`,
        tone: "success",
        priority: "informational",
        sourceEventId: c.id,
      }),
    );
  }

  const loggedInToday = cases.filter((c) => {
    if (normalizeLenderCaseStage(c.caseStage) !== "logged_in_wip") return false;
    return isToday(c.updatedAt || c.createdAt);
  });
  for (const c of loggedInToday.slice(0, 2)) {
    items.push(
      msg(loan, {
        id: `login-${c.id}`,
        text: `Login completed with ${lenderName(c)} for ${label}.`,
        tone: "success",
        priority: "informational",
        sourceEventId: c.id,
      }),
    );
  }

  const uploadedToday = docs.filter(
    (d) =>
      (d.status === "received" || d.status === "verified") &&
      isToday(d.updatedAt || d.receivedDate || d.createdAt),
  );
  for (const d of uploadedToday.slice(0, 2)) {
    items.push(
      msg(loan, {
        id: `up-${d.id ?? d.name}`,
        text: `Documents uploaded for ${label}: ${d.name || "document"}.`,
        tone: "success",
        priority: "informational",
        sourceEventId: d.id,
      }),
    );
  }

  if (primary && (primary.isPrimary || primary.probability === "very_high" || primary.probability === "high")) {
    items.push(
      msg(loan, {
        id: `strong-${primary.id}`,
        text: `CHANAKYA recommendation for ${label}: ${lenderName(primary)} is currently the strongest lender fit.`,
        tone: "success",
        priority: "informational",
        sourceEventId: primary.id,
      }),
    );
  }

  if (loan.approxCibilScore && loan.approxCibilScore !== "not_known") {
    items.push(
      msg(loan, {
        id: "credit-obs",
        text: `Credit observation for ${label}: approximate CIBIL band ${loan.approxCibilScore.replace(/_/g, " ")}.`,
        tone: "info",
        priority: "informational",
      }),
    );
  }

  // Entity timeline events only (already on this loan)
  const timelineToday = timeline.filter((e) => isToday(e.timestamp));
  for (const ev of timelineToday.slice(0, 3)) {
    const title = (ev.title || "").toLowerCase();
    if (
      title.includes("document") ||
      title.includes("upload") ||
      title.includes("lender") ||
      title.includes("approval") ||
      title.includes("login") ||
      title.includes("callback")
    ) {
      const text = (ev.description?.trim() || ev.title || "").slice(0, 120);
      if (!text) continue;
      items.push(
        msg(loan, {
          id: `tl-${ev.id}`,
          text: text.includes(label) ? text : `${label}: ${text}`,
          tone: "info",
          priority: "informational",
          sourceEventId: ev.id,
        }),
      );
    }
  }

  // Policy / product context for this loan only
  if (loan.loanProduct) {
    const hasRiskSignal =
      loan.isDelayed || rejected.length > 0 || missingRequired.length > 0;
    if (hasRiskSignal) {
      items.push(
        msg(loan, {
          id: "policy-impact",
          text: `Policy impact for this loan (${loan.loanProduct}): resolve blockers before advancing ${label}.`,
          tone: "info",
          priority: "informational",
        }),
      );
    }
  }

  // Deduplicate by text; keep highest priority
  const byText = new Map<string, WorkspaceIntelligenceMessage>();
  for (const item of items) {
    const key = item.text.toLowerCase();
    const existing = byText.get(key);
    if (!existing || priorityRank(item.priority) < priorityRank(existing.priority)) {
      byText.set(key, item);
    }
  }

  const unique = [...byText.values()].filter(
    (i) => i.entityId === loan.id && i.scope === "workspace_entity",
  );

  return prioritizeAndLoop(unique.slice(0, 12), loan);
}

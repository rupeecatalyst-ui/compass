/**
 * CHANAKYA Radar — Deal Health + Active Workspace intelligence (Sprint 2).
 * Users never move cards. CHANAKYA classifies health and routes to the right workspace.
 */

import type { LoanFile, LoanLenderExecution } from "@/types/catalyst-one";
import {
  CHANAKYA_RADAR_COLUMNS,
  CHANAKYA_RADAR_EXCLUDED_LENDER_STAGES,
  CHANAKYA_RADAR_EXCLUDED_PROBABILITIES,
  CHANAKYA_RADAR_WORKSPACES,
  type ChanakyaActiveWorkspaceId,
  type ChanakyaAiPriority,
  type ChanakyaDealHealthId,
  type ChanakyaMomentumId,
} from "@/constants/chanakya-radar";
import { LENDER_CASE_STAGE_LABELS } from "@/constants/lender-pipeline";
import { opportunityNumberForFile } from "@/lib/enterprise-credit-workspace";
import { formatINR } from "@/lib/format-currency";

export interface ChanakyaRadarLenderChip {
  lender: string;
  stageLabel: string;
}

export interface ChanakyaWaitingOn {
  label: string;
  emoji: string;
}

export interface ChanakyaNextWorkspace {
  id: ChanakyaActiveWorkspaceId;
  label: string;
  emoji: string;
  /** Base path for intelligent navigation. */
  href: string;
}

export interface ChanakyaRadarCard {
  id: string;
  health: ChanakyaDealHealthId;
  borrower: string;
  opportunityNumber: string;
  product: string;
  loanAmountLabel: string;
  /** Shared filter dimensions — sourced from loan file, not re-scored. */
  relationshipManager: string;
  source: string;
  activeLenders: ChanakyaRadarLenderChip[];
  extraActiveLenders: number;
  /** Intelligent empty-state when no active lenders. */
  lendersInsight: string;
  chanakyaSays: string;
  why: string[];
  recommends: string[];
  expectedOutcome: string;
  nextWorkspace: ChanakyaNextWorkspace;
  waitingOn: ChanakyaWaitingOn;
  lastActivityLabel: string;
  momentum: ChanakyaMomentumId;
  momentumLabel: string;
  aiPriority: ChanakyaAiPriority;
  ageingDays: number;
  ageingLabel: string;
  confidence: number;
  fileId: string;
}

function daysSince(iso?: string): number {
  if (!iso) return 999;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 999;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

function lastActivityIso(file: LoanFile): string {
  return file.timeline?.[0]?.timestamp || file.createdAt || file.loginDate || "";
}

function formatLastActivity(idleDays: number): string {
  if (idleDays <= 0) return "Today";
  if (idleDays === 1) return "Yesterday";
  return `${idleDays} Days Ago`;
}

function friendlyLenderStage(stage?: string): string {
  if (!stage) return "Active";
  const map: Record<string, string> = {
    prelogin: "Prelogin",
    logged_in_wip: "Logged In",
    soft_approved: "Soft Approval",
    final_approved: "Final Approval",
    closure_wip: "Closure / Legal",
    disbursed: "Disbursed",
    hold: "On Hold",
  };
  return map[stage] ?? LENDER_CASE_STAGE_LABELS[stage as keyof typeof LENDER_CASE_STAGE_LABELS] ?? stage;
}

/** Active lenders only — never rejected / lost / cancelled / withdrawn / closed. */
export function listActiveRadarLenders(file: LoanFile): LoanLenderExecution[] {
  return (file.lenders ?? []).filter((l) => {
    if (l.status !== "active") return false;
    if (l.caseStage && CHANAKYA_RADAR_EXCLUDED_LENDER_STAGES.has(l.caseStage)) return false;
    if (l.probability && CHANAKYA_RADAR_EXCLUDED_PROBABILITIES.has(l.probability)) return false;
    return true;
  });
}

function countTerminalLenders(file: LoanFile): number {
  return (file.lenders ?? []).filter((l) => {
    if (l.status === "closed") return true;
    if (l.caseStage === "lost") return true;
    if (l.probability === "rejected" || l.probability === "withdrawn") return true;
    return false;
  }).length;
}

function hasHoldLender(file: LoanFile): boolean {
  return (file.lenders ?? []).some((l) => l.status === "active" && l.caseStage === "hold");
}

function pendingDocCount(file: LoanFile): number {
  return (file.documents ?? []).filter(
    (d) => d.status === "pending" || d.status === "requested" || d.status === "rejected",
  ).length;
}

function documentsLookComplete(file: LoanFile): boolean {
  const docs = file.documents ?? [];
  if (docs.length === 0) return false;
  const done = docs.filter((d) => d.status === "verified" || d.status === "received").length;
  return done / docs.length >= 0.7;
}

function openTasks(file: LoanFile): number {
  return (file.tasks ?? []).filter((t) => !t.completed && t.status !== "completed").length;
}

function leadLender(file: LoanFile): LoanLenderExecution | undefined {
  const active = listActiveRadarLenders(file);
  return active.find((l) => l.isPrimary) ?? active[0];
}

function workspaceMeta(id: ChanakyaActiveWorkspaceId): ChanakyaNextWorkspace {
  const def = CHANAKYA_RADAR_WORKSPACES[id];
  return { id, label: def.label, emoji: def.emoji, href: def.href };
}

/**
 * Active Workspace selection — CHANAKYA routes the user to where work must happen.
 * Strategic Bench = structuring / eligibility
 * Credit Bench = lender processing / documentation
 * Loan Workspace = sanction / legal / disbursement
 */
export function resolveActiveWorkspace(file: LoanFile): ChanakyaActiveWorkspaceId {
  const stage = file.stage;
  const active = listActiveRadarLenders(file);
  const advanced = active.some((l) =>
    ["final_approved", "closure_wip", "disbursed"].includes(l.caseStage ?? ""),
  );
  const softOrLogged = active.some((l) =>
    ["logged_in_wip", "soft_approved", "final_approved"].includes(l.caseStage ?? ""),
  );

  if (stage === "won" || stage === "closure_wip" || stage === "final_approved" || advanced) {
    return "loan_workspace";
  }

  if (
    stage === "raw_lead" ||
    stage === "pre_login" ||
    (active.length === 0 && stage !== "logged_in" && stage !== "credit_wip" && stage !== "soft_approved")
  ) {
    return "strategic_bench";
  }

  if (
    stage === "logged_in" ||
    stage === "credit_wip" ||
    stage === "soft_approved" ||
    softOrLogged ||
    pendingDocCount(file) > 0
  ) {
    return "credit_bench";
  }

  return "credit_bench";
}

function resolveWaitingOn(file: LoanFile, idleDays: number): ChanakyaWaitingOn {
  const lead = leadLender(file);
  const pendingDocs = pendingDocCount(file);
  const gstPending = (file.documents ?? []).some(
    (d) =>
      /gst/i.test(d.name) &&
      (d.status === "pending" || d.status === "requested" || d.status === "rejected"),
  );

  if (hasHoldLender(file) && lead) {
    return { emoji: "🏦", label: lead.lender };
  }

  if (file.stage === "closure_wip" || lead?.caseStage === "closure_wip") {
    return { emoji: "📄", label: "Legal Team" };
  }

  if (file.stage === "final_approved" || lead?.caseStage === "final_approved") {
    return { emoji: "⚙️", label: "Operations" };
  }

  if (gstPending) {
    return { emoji: "📊", label: "Chartered Accountant" };
  }

  if (pendingDocs > 0 && idleDays >= 3) {
    return { emoji: "👤", label: "Customer" };
  }

  if (lead?.caseStage === "soft_approved" || lead?.caseStage === "logged_in_wip") {
    return { emoji: "🏦", label: lead.lender };
  }

  if (file.stage === "credit_wip" || file.stage === "logged_in") {
    return { emoji: "🏦", label: lead?.lender ?? "Credit Officer" };
  }

  if (file.stage === "raw_lead" || file.stage === "pre_login") {
    return { emoji: "👤", label: "Relationship Manager" };
  }

  if (idleDays >= 5) {
    return { emoji: "👤", label: "Customer" };
  }

  return { emoji: "👤", label: file.relationshipManager || "Relationship Manager" };
}

function resolveMomentum(
  file: LoanFile,
  idleDays: number,
  terminal: number,
  soft: boolean,
): { momentum: ChanakyaMomentumId; momentumLabel: string } {
  const recentTimeline = (file.timeline ?? []).filter(
    (e) => daysSince(e.timestamp) <= 3,
  ).length;
  const progressing =
    soft ||
    listActiveRadarLenders(file).some((l) =>
      ["soft_approved", "final_approved", "closure_wip"].includes(l.caseStage ?? ""),
    );

  if (terminal >= 2 || idleDays >= 11 || file.status === "at_risk") {
    return { momentum: "declining", momentumLabel: "▼ Declining" };
  }
  if (recentTimeline >= 1 && progressing && idleDays <= 3) {
    return { momentum: "improving", momentumLabel: "▲ Improving" };
  }
  if (idleDays <= 4 && file.status === "on_track") {
    return { momentum: "improving", momentumLabel: "▲ Improving" };
  }
  if (idleDays >= 7 || file.status === "delayed" || openTasks(file) >= 3) {
    return { momentum: "declining", momentumLabel: "▼ Declining" };
  }
  return { momentum: "stable", momentumLabel: "▬ Stable" };
}

function resolveAiPriority(
  file: LoanFile,
  health: ChanakyaDealHealthId,
  idleDays: number,
  soft: boolean,
): ChanakyaAiPriority {
  if (file.isUrgent || health === "at_risk" || (soft && pendingDocCount(file) > 0)) {
    return "high";
  }
  if (health === "dormant" || health === "needs_attention" || health === "on_hold" || idleDays >= 7) {
    return "high";
  }
  if (health === "on_track" && idleDays <= 3) return "low";
  if (health === "completed") return "low";
  return "medium";
}

interface ClassifiedDeal {
  health: ChanakyaDealHealthId;
  chanakyaSays: string;
  why: string[];
  recommends: string[];
  expectedOutcome: string;
  confidence: number;
}

/**
 * CHANAKYA classification — specific, credit-manager tone.
 * Priority: completed → on_hold → at_risk → dormant → needs_attention → on_track
 */
export function classifyDealHealth(file: LoanFile): ClassifiedDeal {
  const idleDays = daysSince(lastActivityIso(file));
  const terminal = countTerminalLenders(file);
  const active = listActiveRadarLenders(file);
  const soft = active.some((l) => l.caseStage === "soft_approved");
  const docsOk = documentsLookComplete(file);
  const pendingDocs = pendingDocCount(file);
  const lead = leadLender(file);
  const amount = formatINR(file.requiredAmount || file.loanAmount || 0);
  const name = file.customerName.split(" ")[0] || file.customerName;

  if (file.stage === "won" || file.status === "completed") {
    return {
      health: "completed",
      chanakyaSays: `${name}'s ${file.loanProduct} (${amount}) has completed the execution path. Confirm payout and close residual tasks.`,
      why: ["Deal marked completed / Won", "Sanction and disbursement path finished"],
      recommends: ["Confirm payout status", "Close remaining tasks", "Archive residual lender queries"],
      expectedOutcome:
        "If residual payout and accounting checks are completed today, this file can leave the active Radar queue cleanly.",
      confidence: 96,
    };
  }

  if (hasHoldLender(file)) {
    const lenderName = lead?.lender ?? "The lead lender";
    return {
      health: "on_hold",
      chanakyaSays: `${lenderName} has placed this case On Hold. ${name}'s file will not progress until the hold reason is cleared.`,
      why: [
        "Lender case on Hold",
        lead?.holdReason ? `Hold reason: ${lead.holdReason}` : "Hold signal raised by lender",
        idleDays >= 3 ? `Limited progress for ${idleDays} days` : "Awaiting lender release",
      ],
      recommends: [
        "Clarify hold reason with lender",
        "Update customer on revised timeline",
        "Prepare alternate lender path if hold persists",
      ].slice(0, 3),
      expectedOutcome: `If ${lenderName} releases the hold after your clarification, this deal can return to Needs Attention or On Track within the same week.`,
      confidence: 88,
    };
  }

  if (file.status === "at_risk" || terminal >= 2 || (file.status === "delayed" && idleDays >= 10)) {
    const why = [
      terminal >= 2 ? `${terminal} lender rejections / losses` : "Deal health flagged at risk",
      idleDays >= 7 ? `Sparse activity for ${idleDays} days` : "Execution pressure rising",
      pendingDocs > 0 ? `${pendingDocs} document(s) still pending` : "Credit path under pressure",
    ];
    return {
      health: "at_risk",
      chanakyaSays:
        terminal >= 2
          ? `${terminal} lender cases have already ended poorly on ${name}'s ${file.loanProduct}. Rebuild eligibility before chasing the same path.`
          : `${name}'s ${amount} file is At Risk after ${idleDays} days of weak momentum — intervene before it goes dormant.`,
      why,
      recommends: [
        "Call customer today",
        "Add co-applicant if income is constrained",
        "Move to alternate lender",
      ],
      expectedOutcome:
        "If an alternate lender is logged in with corrected eligibility today, this deal can climb from At Risk to Needs Attention.",
      confidence: 84,
    };
  }

  if (idleDays >= 11) {
    return {
      health: "dormant",
      chanakyaSays: `No meaningful activity has been recorded on ${name}'s file for ${idleDays} days. Dormancy is now the primary risk — not lender stage.`,
      why: [
        `No activity for ${idleDays} days`,
        "Customer / RM follow-up gap",
        active.length === 0 ? "No active lender cases" : `${active.length} lender case(s) idle`,
      ],
      recommends: ["Call customer", "Confirm next follow-up date", "Review lender pipeline"],
      expectedOutcome:
        "If the customer is contacted today and a concrete next step is logged, this deal can leave Dormant and re-enter Needs Attention.",
      confidence: 91,
    };
  }

  if (
    file.status === "delayed" ||
    idleDays >= 5 ||
    (active.length === 0 && file.stage !== "raw_lead") ||
    (!docsOk && ["logged_in", "credit_wip", "soft_approved"].includes(file.stage))
  ) {
    const why: string[] = [];
    if (file.status === "delayed") why.push("File status delayed");
    if (idleDays >= 5) why.push(`Customer / file idle for ${idleDays} days`);
    if (pendingDocs > 0) why.push(`${pendingDocs} pending document(s)`);
    if (!docsOk && pendingDocs === 0) why.push("Pending documentation");
    if (active.length === 0) why.push("No active lender cases");
    if (soft) why.push("Soft Approval achieved — clearance still pending");
    if (file.approxPropertyValue && file.requiredAmount > file.approxPropertyValue * 0.8) {
      why.push("Requested amount high vs indicated property value");
    }

    const recommends = soft
      ? ["Upload GST Returns", "Respond to lender query", "Call customer"]
      : active.length === 0
        ? ["Open Strategic Bench", "Select alternate lender", "Call customer"]
        : ["Call customer", "Upload pending documents", "Respond to lender query"];

    return {
      health: "needs_attention",
      chanakyaSays: soft
        ? `${lead?.lender ?? "The lender"} has Soft Approval on ${name}'s file — bank queries and residual documents are now the only blockers.`
        : active.length === 0
          ? `${name}'s ${file.loanProduct} still has no live lender case. Structuring and lender selection must move before credit can advance.`
          : `${name}'s ${amount} ${file.loanProduct} needs attention before it slips into dormancy.`,
      why: why.length ? why.slice(0, 5) : ["Follow-up required"],
      recommends: recommends.slice(0, 3),
      expectedOutcome: soft
        ? "If the lender query is answered today, Soft Approval is expected to hold and the file can move toward Final Approval."
        : pendingDocs > 0
          ? "If the pending GST Returns / documents are uploaded today, this deal is likely to move from Needs Attention to On Track."
          : "If a lender login is completed today, this deal should move from Needs Attention toward On Track.",
      confidence: 87,
    };
  }

  const why: string[] = ["Healthy execution momentum"];
  if (soft) why.push("Soft Approval achieved");
  if (docsOk) why.push("Documents substantially complete");
  if (active.length > 0) why.push(`${active.length} active lender case(s)`);
  if (idleDays <= 2) why.push("Recent activity recorded");

  return {
    health: "on_track",
    chanakyaSays: soft
      ? `${lead?.lender ?? "Lender"} has Soft Approval on ${name}'s ${file.loanProduct} and documentation is keeping pace — protect the cadence.`
      : `${name}'s ${amount} ${file.loanProduct} is progressing normally with ${active.length || "no"} live lender path${active.length === 1 ? "" : "s"}.`,
    why,
    recommends: soft
      ? ["Advance toward Final Approval", "Clear residual bank queries", "Maintain follow-up cadence"]
      : ["Maintain follow-up cadence", "Advance lender pipeline", "Confirm next customer touchpoint"],
    expectedOutcome: soft
      ? "If residual conditions are cleared this week, Final Approval is the expected next milestone."
      : "If the current lender path continues without idle gaps, this deal should remain On Track through the next stage.",
    confidence: soft && docsOk ? 92 : 86,
  };
}

export function mapLoanFileToRadarCard(file: LoanFile): ChanakyaRadarCard {
  const classified = classifyDealHealth(file);
  const active = listActiveRadarLenders(file);
  const idleDays = daysSince(lastActivityIso(file));
  const terminal = countTerminalLenders(file);
  const soft = active.some((l) => l.caseStage === "soft_approved");
  const workspaceId = resolveActiveWorkspace(file);
  const { momentum, momentumLabel } = resolveMomentum(file, idleDays, terminal, soft);
  const ageingDays = daysSince(file.createdAt || file.loginDate);

  const chips = active.slice(0, 3).map((l) => ({
    lender: l.lender,
    stageLabel: friendlyLenderStage(l.caseStage),
  }));

  const lendersInsight =
    active.length > 0
      ? ""
      : file.stage === "raw_lead" || file.stage === "pre_login"
        ? "Lender selection pending — open Strategic Bench"
        : "Awaiting first active lender login";

  return {
    id: file.id,
    health: classified.health,
    borrower: file.customerName,
    opportunityNumber: opportunityNumberForFile(file),
    product: file.loanProduct,
    loanAmountLabel: formatINR(file.requiredAmount || file.loanAmount || 0),
    relationshipManager: file.relationshipManager?.trim() || "Unassigned",
    source: file.source?.trim() || file.sourceContactName?.trim() || "Unknown",
    activeLenders: chips,
    extraActiveLenders: Math.max(0, active.length - 3),
    lendersInsight,
    chanakyaSays: classified.chanakyaSays,
    why: classified.why.slice(0, 5),
    recommends: classified.recommends.slice(0, 3),
    expectedOutcome: classified.expectedOutcome,
    nextWorkspace: workspaceMeta(workspaceId),
    waitingOn: resolveWaitingOn(file, idleDays),
    lastActivityLabel: formatLastActivity(Math.min(idleDays, 999) === 999 ? ageingDays : idleDays),
    momentum,
    momentumLabel,
    aiPriority: resolveAiPriority(file, classified.health, idleDays, soft),
    ageingDays,
    ageingLabel: `${ageingDays} Days`,
    confidence: classified.confidence,
    fileId: file.id,
  };
}

export function listChanakyaRadarCards(files: LoanFile[]): ChanakyaRadarCard[] {
  return files.map(mapLoanFileToRadarCard);
}

export function groupRadarCardsByHealth(
  cards: ChanakyaRadarCard[],
): Record<ChanakyaDealHealthId, ChanakyaRadarCard[]> {
  const map = Object.fromEntries(
    CHANAKYA_RADAR_COLUMNS.map((c) => [c.id, [] as ChanakyaRadarCard[]]),
  ) as Record<ChanakyaDealHealthId, ChanakyaRadarCard[]>;

  for (const card of cards) {
    map[card.health].push(card);
  }
  return map;
}

export function summarizeRadarHealth(
  cards: ChanakyaRadarCard[],
): { id: ChanakyaDealHealthId; label: string; count: number; tone: string }[] {
  const groups = groupRadarCardsByHealth(cards);
  return CHANAKYA_RADAR_COLUMNS.map((c) => ({
    id: c.id,
    label: c.label,
    count: groups[c.id]?.length ?? 0,
    tone: c.tone,
  }));
}

/** @deprecated Prefer resolveActiveWorkspace — retained for tests */
export function hrefForWorkspace(id: ChanakyaActiveWorkspaceId): string {
  return CHANAKYA_RADAR_WORKSPACES[id].href;
}

/**
 * CHANAKYA Radar — derive Deal Health classification (AI prioritisation rules).
 * Not a workflow stage board. Users never move cards.
 */

import type { LoanFile, LoanLenderExecution } from "@/types/catalyst-one";
import {
  CHANAKYA_RADAR_COLUMNS,
  CHANAKYA_RADAR_EXCLUDED_LENDER_STAGES,
  CHANAKYA_RADAR_EXCLUDED_PROBABILITIES,
  type ChanakyaDealHealthId,
} from "@/constants/chanakya-radar";
import { LENDER_CASE_STAGE_LABELS } from "@/constants/lender-pipeline";
import { opportunityNumberForFile } from "@/lib/enterprise-credit-workspace";
import { formatINR } from "@/lib/format-currency";

export interface ChanakyaRadarLenderChip {
  lender: string;
  stageLabel: string;
}

export interface ChanakyaRadarCard {
  id: string;
  health: ChanakyaDealHealthId;
  borrower: string;
  opportunityNumber: string;
  product: string;
  loanAmountLabel: string;
  activeLenders: ChanakyaRadarLenderChip[];
  extraActiveLenders: number;
  chanakyaSays: string;
  why: string[];
  recommends: string[];
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
  return (file.lenders ?? []).some(
    (l) => l.status === "active" && l.caseStage === "hold",
  );
}

function hasSoftApproval(file: LoanFile): boolean {
  return listActiveRadarLenders(file).some((l) => l.caseStage === "soft_approved");
}

function documentsLookComplete(file: LoanFile): boolean {
  const docs = file.documents ?? [];
  if (docs.length === 0) return false;
  const done = docs.filter((d) => d.status === "verified" || d.status === "received").length;
  return done / docs.length >= 0.7;
}

/**
 * CHANAKYA classification — deterministic enterprise rules (Phase 1 intelligence).
 * Priority: completed → on_hold → at_risk → dormant → needs_attention → on_track
 */
export function classifyDealHealth(file: LoanFile): {
  health: ChanakyaDealHealthId;
  chanakyaSays: string;
  why: string[];
  recommends: string[];
  confidence: number;
} {
  const idleDays = daysSince(lastActivityIso(file));
  const terminal = countTerminalLenders(file);
  const active = listActiveRadarLenders(file);
  const soft = hasSoftApproval(file);
  const docsOk = documentsLookComplete(file);

  if (file.stage === "won" || file.status === "completed") {
    return {
      health: "completed",
      chanakyaSays: "This transaction has reached completion. Review closure and accounting outcomes.",
      why: ["Deal marked completed / Won", "Execution path finished"],
      recommends: ["Confirm payout status", "Close remaining tasks"],
      confidence: 96,
    };
  }

  if (hasHoldLender(file)) {
    return {
      health: "on_hold",
      chanakyaSays: "At least one active lender case is On Hold — progress is paused until released.",
      why: ["Lender case on Hold", idleDays >= 3 ? `Limited progress for ${idleDays} days` : "Hold signal raised"],
      recommends: ["Clarify hold reason with lender", "Update customer on timeline"],
      confidence: 88,
    };
  }

  if (file.status === "at_risk" || terminal >= 2 || (file.status === "delayed" && idleDays >= 10)) {
    const why = [
      terminal >= 2 ? `${terminal} lender rejections / losses` : "Deal health flagged at risk",
      idleDays >= 7 ? `Sparse activity for ${idleDays} days` : "Execution pressure rising",
    ];
    return {
      health: "at_risk",
      chanakyaSays:
        terminal >= 2
          ? `${terminal} lender cases ended poorly. Reassess eligibility and alternate lenders.`
          : `Deal health is At Risk after ${idleDays} days of weak momentum.`,
      why,
      recommends: [
        "Add co-applicant if income is constrained",
        "Apply with alternate lender",
        "Reduce loan amount if required",
        "Contact customer today",
      ],
      confidence: 84,
    };
  }

  if (idleDays >= 11) {
    return {
      health: "dormant",
      chanakyaSays: `No meaningful activity has been recorded for ${idleDays} days.`,
      why: [`No activity for ${idleDays} days`, "Deal not progressing"],
      recommends: ["Contact customer", "Confirm next follow-up", "Review lender pipeline"],
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
    if (idleDays >= 5) why.push(`${idleDays} days since last activity`);
    if (!docsOk) why.push("Pending documentation");
    if (active.length === 0) why.push("No active lender cases");
    return {
      health: "needs_attention",
      chanakyaSays: soft
        ? "Soft Approval is in play — clear remaining documentation and bank queries promptly."
        : "This deal needs attention before it slips into dormancy or risk.",
      why: why.length ? why : ["Follow-up required"],
      recommends: soft
        ? ["Upload GST Returns if pending", "Respond to bank query", "Contact customer"]
        : ["Contact customer", "Upload pending documents", "Login with a lender"],
      confidence: 87,
    };
  }

  const why: string[] = ["Healthy execution momentum"];
  if (soft) why.push("Soft Approval achieved");
  if (docsOk) why.push("Documents substantially complete");
  if (active.length > 0) why.push(`${active.length} active lender case(s)`);

  return {
    health: "on_track",
    chanakyaSays: soft
      ? `${active[0]?.lender ?? "Lender"} has reached Soft Approval and customer documentation is progressing well.`
      : "Execution is progressing normally. Continue the current lender path.",
    why,
    recommends: ["Maintain follow-up cadence", "Advance lender pipeline"],
    confidence: soft && docsOk ? 92 : 86,
  };
}

export function mapLoanFileToRadarCard(file: LoanFile): ChanakyaRadarCard {
  const classified = classifyDealHealth(file);
  const active = listActiveRadarLenders(file);
  const chips = active.slice(0, 3).map((l) => ({
    lender: l.lender,
    stageLabel: l.caseStage
      ? LENDER_CASE_STAGE_LABELS[l.caseStage] ?? l.caseStage
      : "Active",
  }));

  return {
    id: file.id,
    health: classified.health,
    borrower: file.customerName,
    opportunityNumber: opportunityNumberForFile(file),
    product: file.loanProduct,
    loanAmountLabel: formatINR(file.requiredAmount || file.loanAmount || 0),
    activeLenders: chips,
    extraActiveLenders: Math.max(0, active.length - 3),
    chanakyaSays: classified.chanakyaSays,
    why: classified.why,
    recommends: classified.recommends,
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

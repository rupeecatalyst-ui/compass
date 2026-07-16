/**
 * Derive Enterprise Phase Readiness snapshot for a transaction.
 */

import { CHANAKYA_LOAN_JOURNEY_PHASES } from "@/constants/chanakya-guide";
import { normalizeLenderCaseStage } from "@/constants/lender-pipeline";
import { buildProposalReadinessReview } from "@/lib/chanakya-phase5-intelligence/proposal-intelligence";
import {
  listEcmContacts,
  listProvisionalContactGaps,
} from "@/lib/enterprise-contact-master";
import {
  deriveDocumentCollection,
  deriveDocumentHealth,
  deriveDocumentVerification,
} from "@/lib/enterprise-phase-readiness/document-health";
import type { LoanFile, LenderCaseStage } from "@/types/catalyst-one";
import type {
  PhaseReadinessDetail,
  PhaseReadinessSnapshot,
} from "@/types/enterprise-phase-readiness";

export interface DerivePhaseReadinessInput {
  file?: LoanFile | null;
  /** Opportunity / contact framing signals when file is thin. */
  hasContact?: boolean;
  hasOpportunity?: boolean;
  lifeFinalized?: boolean;
  customerName?: string | null;
  productLabel?: string | null;
}

const EXECUTION_STAGE_SCORE: Record<LenderCaseStage, number> = {
  prelogin: 15,
  logged_in_wip: 35,
  soft_approved: 55,
  final_approved: 75,
  closure_wip: 85,
  disbursed: 100,
  lost: 10,
  hold: 25,
};

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function leadQualificationPct(input: DerivePhaseReadinessInput): {
  pct: number;
  metrics: PhaseReadinessDetail["metrics"];
  tip: string;
} {
  const hasContact = Boolean(
    input.hasContact || input.customerName || input.file?.customerName,
  );
  const hasProduct = Boolean(
    input.productLabel || input.file?.loanProduct,
  );
  const hasAmount = Boolean((input.file?.requiredAmount || input.file?.loanAmount || 0) > 0);
  const life = Boolean(input.lifeFinalized);

  // Progressive Contact Creation — advisory readiness only (never blocks).
  const ids = [
    input.file?.customerId,
    ...(input.file?.participants ?? []).map((p) => p.entityId),
  ].filter(Boolean) as string[];
  const contacts = listEcmContacts().filter((c) => ids.includes(c.id));
  const provisionalGaps = contacts.reduce(
    (n, c) => n + (c.status === "provisional" ? listProvisionalContactGaps(c).length : 0),
    0,
  );

  let score = 0;
  if (hasContact) score += 30;
  if (hasProduct) score += 25;
  if (hasAmount) score += 20;
  if (life) score += 25;
  else if (hasContact && hasProduct) score += 10;
  if (provisionalGaps > 0) score = Math.max(40, score - Math.min(15, provisionalGaps * 2));

  const metrics: PhaseReadinessDetail["metrics"] = [
    {
      id: "contact",
      label: "Contact",
      valueLabel: hasContact
        ? provisionalGaps > 0
          ? `Linked · ${provisionalGaps} provisional gap(s) — Chanakya will follow up`
          : "Identity captured"
        : "Contact incomplete",
      pct: hasContact ? (provisionalGaps > 0 ? 70 : 100) : 0,
      tone: hasContact ? (provisionalGaps > 0 ? "warning" : "success") : "warning",
    },
    {
      id: "opportunity",
      label: "Opportunity Workspace",
      valueLabel: hasProduct && hasAmount ? "Framed" : "Needs product / amount",
      pct: hasProduct && hasAmount ? 100 : hasProduct || hasAmount ? 50 : 0,
      tone: hasProduct && hasAmount ? "success" : "warning",
    },
    {
      id: "life",
      label: "Strategic / LIFE",
      valueLabel: life ? "LIFE finalized" : "LIFE pending",
      pct: life ? 100 : 35,
      tone: life ? "success" : "warning",
    },
  ];

  const tip = !hasContact
    ? "Establish a clean Contact record before framing the opportunity."
    : provisionalGaps > 0
      ? "Provisional Contacts are usable — Chanakya will remind you to complete Mobile, PAN, Email, and KYC before lender-critical stages."
      : !life
        ? "Complete Strategic Workspace planning and finalize LIFE before document-heavy credit work."
        : "Lead Qualification is complete — protect this foundation as you move into Credit Readiness.";

  return { pct: clampPct(score), metrics, tip };
}

function creditReadinessPct(input: DerivePhaseReadinessInput): {
  pct: number;
  metrics: PhaseReadinessDetail["metrics"];
  tip: string;
  creditScore: number;
} {
  const collection = deriveDocumentCollection(input.file);
  const verification = deriveDocumentVerification(input.file);
  const review = buildProposalReadinessReview({
    productName: input.file?.loanProduct || input.productLabel || "Home Loan",
    loanAmount: input.file?.requiredAmount || input.file?.loanAmount || 0,
    loanFileId: input.file?.id,
  });
  const statedPct = clampPct(review.completenessPct);

  const score = clampPct(
    collection.pct * 0.45 + verification.pct * 0.25 + statedPct * 0.3,
  );

  const metrics: PhaseReadinessDetail["metrics"] = [
    {
      id: "doc_collection",
      label: "Document Collection",
      valueLabel: `${collection.receivedCount} / ${collection.totalCount} Documents Received`,
      pct: collection.pct,
      tone: collection.pct >= 80 ? "success" : collection.pct >= 40 ? "warning" : "danger",
    },
    {
      id: "doc_verification",
      label: "Document Verification",
      valueLabel: `${verification.verifiedCount} / ${Math.max(verification.eligibleCount, collection.receivedCount)} Verified`,
      pct: verification.pct,
      tone: verification.pct >= 70 ? "success" : "warning",
    },
    {
      id: "credit_score",
      label: "Credit Readiness Score",
      valueLabel: `${statedPct} / 100`,
      pct: statedPct,
      tone: statedPct >= 80 ? "success" : "warning",
    },
  ];

  const tip =
    collection.criticalMissing.length > 0
      ? `Collect the remaining mandatory income documents before proceeding to lender evaluation.`
      : verification.pct < 60
        ? "Verification is lagging collection — verify received packs before Credit Workbench exit."
        : "Credit Readiness is healthy — proceed carefully into Loan Execution.";

  return { pct: score, metrics, tip, creditScore: statedPct };
}

function loanExecutionPct(file: LoanFile | null | undefined): {
  pct: number;
  metrics: PhaseReadinessDetail["metrics"];
  tip: string;
} {
  const cases = file?.lenders ?? [];
  const active = cases.filter((c) => {
    const s = normalizeLenderCaseStage(c.caseStage);
    return s !== "lost";
  });
  let casePct = 0;
  if (active.length === 0) {
    casePct = file ? 10 : 0;
  } else {
    casePct = clampPct(
      active.reduce(
        (s, c) => s + (EXECUTION_STAGE_SCORE[normalizeLenderCaseStage(c.caseStage)] ?? 15),
        0,
      ) / active.length,
    );
  }

  const tasks = file?.tasks ?? [];
  const openTasks = tasks.filter((t) => !t.completed);
  // ... leave as is
  const taskPct =
    tasks.length === 0 ? (casePct > 20 ? 50 : 0) : clampPct(((tasks.length - openTasks.length) / tasks.length) * 100);

  const timelinePct = (file?.timeline?.length ?? 0) > 0 ? Math.min(100, (file!.timeline!.length / 5) * 40 + 20) : 0;

  const hasApproval = active.some((c) => {
    const s = normalizeLenderCaseStage(c.caseStage);
    return s === "soft_approved" || s === "final_approved" || s === "closure_wip" || s === "disbursed";
  });

  const pct = clampPct(casePct * 0.55 + taskPct * 0.2 + timelinePct * 0.1 + (hasApproval ? 15 : 0));

  const metrics: PhaseReadinessDetail["metrics"] = [
    {
      id: "lenders",
      label: "Lender Pipeline",
      valueLabel:
        active.length === 0
          ? "No active lender cases"
          : `${active.length} active case${active.length === 1 ? "" : "s"} · ${casePct}% avg progress`,
      pct: casePct,
      tone: casePct >= 55 ? "success" : "warning",
    },
    {
      id: "tasks",
      label: "Tasks",
      valueLabel:
        tasks.length === 0
          ? "No tasks logged"
          : `${tasks.length - openTasks.length} / ${tasks.length} cleared`,
      pct: taskPct,
      tone: openTasks.length === 0 && tasks.length > 0 ? "success" : "warning",
    },
    {
      id: "approval",
      label: "Approval",
      valueLabel: hasApproval ? "Approval signal present" : "Awaiting approval",
      pct: hasApproval ? 100 : 0,
      tone: hasApproval ? "success" : "warning",
    },
  ];

  const tip =
    active.length === 0
      ? "Open Lender Pipeline and create at least one lender case to start execution."
      : openTasks.length > 0
        ? "Clear overdue execution tasks so lender SLAs stay protected."
        : hasApproval
          ? "Approval momentum is present — prepare disbursement readiness."
          : "Advance lender cases through login and credit WIP toward soft approval.";

  return { pct, metrics, tip };
}

function postDisbursementPct(file: LoanFile | null | undefined): {
  pct: number;
  metrics: PhaseReadinessDetail["metrics"];
  tip: string;
} {
  const cases = file?.lenders ?? [];
  const anyDisbursed = cases.some(
    (c) => normalizeLenderCaseStage(c.caseStage) === "disbursed",
  );
  const anyClosure = cases.some((c) => {
    const s = normalizeLenderCaseStage(c.caseStage);
    return s === "closure_wip" || s === "disbursed";
  });
  const fileWon = file?.stage === "won" || file?.stage === "closure_wip";

  let pct = 0;
  if (anyDisbursed || fileWon) pct = 70;
  if (anyDisbursed && fileWon) pct = 90;
  if (anyClosure && !anyDisbursed) pct = 35;

  const metrics: PhaseReadinessDetail["metrics"] = [
    {
      id: "disbursement",
      label: "Disbursement",
      valueLabel: anyDisbursed ? "Disbursed" : "Not started",
      pct: anyDisbursed ? 100 : 0,
      tone: anyDisbursed ? "success" : "neutral",
    },
    {
      id: "accounting",
      label: "Accounting",
      valueLabel: anyDisbursed ? "Pending commercial close" : "Waiting on disbursement",
      pct: anyDisbursed ? 40 : 0,
      tone: "neutral",
    },
    {
      id: "closure",
      label: "Closure",
      valueLabel: fileWon ? "File closing" : "Open",
      pct: fileWon ? 80 : 0,
      tone: fileWon ? "success" : "neutral",
    },
  ];

  const tip = anyDisbursed
    ? "Complete accounting and orderly closure so the commercial loop stays trustworthy."
    : "Post Disbursement unlocks after fund release — focus on execution first.";

  return { pct: clampPct(pct), metrics, tip };
}

function buildChanakyaMessage(
  overall: number,
  phases: PhaseReadinessDetail[],
  nextAction: string,
): string {
  const weakest = [...phases].sort((a, b) => a.pct - b.pct)[0];
  if (!weakest) {
    return `Your transaction is ${overall}% ready. Continue the certified business journey.`;
  }
  if (weakest.criticalMissing.length > 0) {
    return `Your transaction is ${overall}% ready. ${weakest.label} is currently blocked because ${weakest.criticalMissing.length} mandatory document${weakest.criticalMissing.length === 1 ? " is" : "s are"} still pending. ${nextAction}`;
  }
  if (weakest.pct < 50) {
    return `Your transaction is ${overall}% ready. ${weakest.label} needs attention (${weakest.pct}%). ${nextAction}`;
  }
  return `Your transaction is ${overall}% ready. ${weakest.label} is the next focus. ${nextAction}`;
}

export function derivePhaseReadiness(
  input: DerivePhaseReadinessInput,
): PhaseReadinessSnapshot {
  const collection = deriveDocumentCollection(input.file);
  const verification = deriveDocumentVerification(input.file);
  const health = deriveDocumentHealth(input.file);

  const lead = leadQualificationPct(input);
  const credit = creditReadinessPct(input);
  const execution = loanExecutionPct(input.file);
  const post = postDisbursementPct(input.file);

  const phaseDefs = CHANAKYA_LOAN_JOURNEY_PHASES;
  const phases: PhaseReadinessDetail[] = [
    {
      phaseId: "lead_qualification",
      label: phaseDefs[0]!.label,
      pct: lead.pct,
      tone: "blue",
      tooltip: `${phaseDefs[0]!.label}: ${lead.pct}% — Contact, Opportunity, Strategic / LIFE.`,
      metrics: lead.metrics,
      criticalMissing: [],
      chanakyaTip: lead.tip,
    },
    {
      phaseId: "credit_readiness",
      label: phaseDefs[1]!.label,
      pct: credit.pct,
      tone: "purple",
      tooltip: `${phaseDefs[1]!.label}: ${credit.pct}% — Documents, verification, credit score.`,
      metrics: credit.metrics,
      criticalMissing: collection.criticalMissing,
      chanakyaTip: credit.tip,
      documentCollection: collection,
      documentVerification: verification,
      creditScore: { score: credit.creditScore, max: 100 },
      documentHealth: health,
    },
    {
      phaseId: "loan_execution",
      label: phaseDefs[2]!.label,
      pct: execution.pct,
      tone: "green",
      tooltip: `${phaseDefs[2]!.label}: ${execution.pct}% — Lender Pipeline, Tasks, Approval.`,
      metrics: execution.metrics,
      criticalMissing: [],
      chanakyaTip: execution.tip,
    },
    {
      phaseId: "post_disbursement",
      label: phaseDefs[3]!.label,
      pct: post.pct,
      tone: "orange",
      tooltip: `${phaseDefs[3]!.label}: ${post.pct}% — Disbursement, Accounting, Closure.`,
      metrics: post.metrics,
      criticalMissing: [],
      chanakyaTip: post.tip,
    },
  ];

  // Overall: equal phase weights (headline KPI)
  const overallPct = clampPct(
    phases.reduce((s, p) => s + p.pct, 0) / Math.max(phases.length, 1),
  );

  const weakest = [...phases].sort((a, b) => a.pct - b.pct)[0]!;
  const nextBusinessAction =
    weakest.criticalMissing.length > 0
      ? `Complete those documents before lender execution.`
      : weakest.chanakyaTip;

  return {
    overallPct,
    phases,
    chanakyaMessage: buildChanakyaMessage(overallPct, phases, nextBusinessAction),
    nextBusinessAction,
    documentHealth: health,
    documentCollection: collection,
  };
}

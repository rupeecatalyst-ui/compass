import { LENDER_CASE_STAGE_LABELS, normalizeLenderCaseStage } from "@/constants/lender-pipeline";
import { LENDER_PROBABILITY_LABELS } from "@/constants/lender-pipeline";
import { STAGE_LABELS } from "@/constants/loan-stage-master";
import { getPublishedPolicies } from "@/lib/credit-risk-engine/policy-store";
import { getProductByName } from "@/constants/product-master";
import {
  buildLenderMomentumProfiles,
  buildLenderRoiProfiles,
  computeInterestSavings,
  computeMonthlyEmi,
  computeTotalInterest,
  daysSinceUpdated,
  expressStageIndex,
  EXPRESS_STAGES,
  getApprovalProbabilityPct,
  resolveProductRoiScale,
  type LenderMomentumProfile,
  type LenderRoiProfile,
} from "@/lib/insights/lender-intelligence";
import type { LenderCaseStage, LoanFile, LoanLenderExecution } from "@/types/catalyst-one";

export type MissionStatus = "on_track" | "at_risk" | "critical" | "completed";
export type ExpressSortKey = "confidence" | "roi" | "momentum" | "eta" | "revenue" | "probability";
export type StrategicPreference = "primary" | "secondary" | "exploratory";

export interface ExecutiveKpis {
  missionStatus: MissionStatus;
  missionStatusLabel: string;
  loanHealth: number;
  recommendationConfidence: number;
  bestRoi: number;
  bestRoiLender: string;
  expectedRevenue: number;
  expectedPayout: number;
  averageTat: number;
  documentsCompletion: number;
  tasksCompletion: number;
  riskScore: number;
}

export interface LenderExpressRow {
  lenderCaseId: string;
  lender: string;
  stage: LenderCaseStage;
  stageLabel: string;
  subStage?: string;
  progressPct: number;
  confidenceScore: number;
  approvalProbability: number;
  approvalProbabilityLabel: string;
  momentumScore: number;
  momentumLabel: string;
  roi: number;
  etaDays: number;
  etaLabel: string;
  expectedRevenue: number;
  strategicPreference: StrategicPreference;
  isPrimary?: boolean;
  roiProfile: LenderRoiProfile;
  momentumProfile: LenderMomentumProfile;
}

export interface TerminalOutcome {
  lender: string;
  lenderCaseId: string;
  outcome: "hold" | "lost";
  reason?: string;
  since: string;
}

export interface CommercialIntel {
  scale: ReturnType<typeof resolveProductRoiScale>;
  roiProfiles: LenderRoiProfile[];
  savings: ReturnType<typeof computeInterestSavings>;
  bestOfferLender: string;
  emiComparisons: { lender: string; roi: number; emi: number }[];
  processingFees: { lender: string; fee: number; feeLabel: string }[];
}

export interface ExecutionIntel {
  momentumProfiles: LenderMomentumProfile[];
  averageTat: number;
  stageBottleneck: string;
  idleLenders: { lender: string; idleDays: number }[];
  slaStatus: "within" | "watch" | "breach";
  followUpScore: number;
  etaComparisons: { lender: string; etaDays: number }[];
}

export interface RiskIntel {
  foir: number;
  dbr: number;
  cibil: number;
  eligibilityScore: number;
  financialHealthScore: number;
  policyCompliance: number;
  exceptionCount: number;
  ruleViolations: { code: string; label: string; severity: "low" | "medium" | "high" }[];
}

export interface FinancialIntel {
  expectedRevenue: number;
  bookedRevenue: number;
  expectedPayout: number;
  margin: number;
  profitability: "strong" | "moderate" | "thin";
  invoiceStatus: string;
  receivableStatus: string;
}

export interface ProcessIntel {
  timelineEvents: number;
  timelineCompletion: number;
  documentsCompletion: number;
  tasksCompletion: number;
  participantCount: number;
  propertyJourney: string;
  workflowCompletion: number;
}

export interface ChanakyaBriefing {
  missionStatus: string;
  leadLender: string;
  confidence: number;
  approvalProbability: number;
  commercialWinner: string;
  estimatedDisbursement: string;
  attentionItems: string[];
  recommendation: string;
}

export interface MissionControlSnapshot {
  kpis: ExecutiveKpis;
  expressRows: LenderExpressRow[];
  terminalOutcomes: TerminalOutcome[];
  commercial: CommercialIntel;
  execution: ExecutionIntel;
  risk: RiskIntel;
  financial: FinancialIntel;
  process: ProcessIntel;
  briefing: ChanakyaBriefing;
}

const ETA_BY_STAGE: Record<LenderCaseStage, number> = {
  prelogin: 21,
  logged_in_wip: 14,
  soft_approved: 10,
  final_approved: 7,
  closure_wip: 3,
  disbursed: 0,
  hold: 14,
  lost: 0,
};

function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 10000;
  return h;
}

function docCompletionPct(loan: LoanFile): number {
  const docs = loan.documents ?? [];
  if (docs.length === 0) return 0;
  return Math.round(
    (docs.filter((d) => d.status === "received" || d.status === "verified").length / docs.length) * 100,
  );
}

function taskCompletionPct(loan: LoanFile): number {
  const tasks = loan.tasks ?? [];
  if (tasks.length === 0) return 0;
  return Math.round(
    (tasks.filter((t) => t.completed || t.status === "completed").length / tasks.length) * 100,
  );
}

function computeConfidence(
  momentum: number,
  approvalProb: number,
  stageIdx: number,
  isPrimary: boolean,
  roiRank?: number,
): number {
  let score =
    momentum * 0.35 + approvalProb * 0.25 + (stageIdx >= 0 ? (stageIdx / 5) * 100 : 0) * 0.25;
  if (isPrimary) score += 12;
  if (roiRank === 1) score += 8;
  else if (roiRank === 2) score += 4;
  return Math.min(99, Math.round(score));
}

function strategicPreference(c: LoanLenderExecution, momentum: number): StrategicPreference {
  if (c.isPrimary) return "primary";
  if (momentum >= 70) return "secondary";
  return "exploratory";
}

function estimateEtaDays(stage: LenderCaseStage, idleDays: number): number {
  const base = ETA_BY_STAGE[stage] ?? 14;
  return Math.max(0, base + Math.floor(idleDays / 2));
}

function resolveMissionStatus(loan: LoanFile, cases: LoanLenderExecution[]): MissionStatus {
  const active = cases.filter((c) => c.status !== "closed");
  if (active.some((c) => normalizeLenderCaseStage(c.caseStage) === "disbursed")) return "completed";
  if (loan.status === "delayed" || active.some((c) => normalizeLenderCaseStage(c.caseStage) === "lost"))
    return "critical";
  if (loan.status === "at_risk" || active.some((c) => normalizeLenderCaseStage(c.caseStage) === "hold"))
    return "at_risk";
  return "on_track";
}

function buildRiskIntel(loan: LoanFile): RiskIntel {
  const h = stableHash(loan.id + loan.customerId);
  const income =
    loan.businessDetails?.monthlySalary ??
    (loan.businessDetails?.annualProfit ? loan.businessDetails.annualProfit / 12 : 85000);
  const emi = computeMonthlyEmi(
    loan.requiredAmount,
    loan.interestRate,
    loan.tenure ?? 240,
  );
  const foir = Math.min(72, Math.round((emi / Math.max(income, 1)) * 100 * 10) / 10);
  const dbr = Math.min(68, Math.round((foir * 0.85 + (h % 8)) * 10) / 10);
  const cibil = 680 + (h % 130);
  const policies = getPublishedPolicies().filter(
    (p) => p.productName.toLowerCase() === loan.loanProduct.toLowerCase(),
  );
  const policyCompliance = policies.length > 0 ? 78 + (h % 18) : 65 + (h % 20);
  const violations: RiskIntel["ruleViolations"] = [];
  if (foir > 55) violations.push({ code: "FIN_FOIR_MAX", label: "FOIR approaching policy ceiling", severity: "medium" });
  if (cibil < 700) violations.push({ code: "BUR_CIBIL_MIN", label: "Bureau score below preferred band", severity: "low" });

  return {
    foir,
    dbr,
    cibil,
    eligibilityScore: Math.min(98, 62 + (h % 35)),
    financialHealthScore: Math.min(95, 58 + (h % 38)),
    policyCompliance,
    exceptionCount: violations.length,
    ruleViolations: violations,
  };
}

export function buildMissionControlSnapshot(loan: LoanFile, cases: LoanLenderExecution[]): MissionControlSnapshot {
  const scale = resolveProductRoiScale(loan);
  const roiProfiles = buildLenderRoiProfiles(loan, cases, scale);
  const momentumProfiles = buildLenderMomentumProfiles(loan, cases);
  const savings = computeInterestSavings(loan, roiProfiles);
  const active = cases.filter((c) => c.status !== "closed");
  const mainLine = active.filter((c) => {
    const s = normalizeLenderCaseStage(c.caseStage);
    return s !== "hold" && s !== "lost";
  });
  const terminal = active.filter((c) => {
    const s = normalizeLenderCaseStage(c.caseStage);
    return s === "hold" || s === "lost";
  });

  const expressRows: LenderExpressRow[] = mainLine.map((c) => {
    const stage = normalizeLenderCaseStage(c.caseStage);
    const stageIdx = expressStageIndex(stage);
    const roi = roiProfiles.find((r) => r.lenderCaseId === c.id)!;
    const momentum = momentumProfiles.find((m) => m.lenderCaseId === c.id)!;
    const approvalProb = getApprovalProbabilityPct(c);
    const idle = daysSinceUpdated(c.updatedAt);
    const etaDays = estimateEtaDays(stage, idle);
    const progressPct = stageIdx >= 0 ? (stageIdx / (EXPRESS_STAGES.length - 1)) * 100 : 0;

    return {
      lenderCaseId: c.id,
      lender: c.lender,
      stage,
      stageLabel: LENDER_CASE_STAGE_LABELS[stage],
      subStage: c.caseSubStage,
      progressPct,
      confidenceScore: computeConfidence(momentum.score, approvalProb, stageIdx, !!c.isPrimary, roi.rank),
      approvalProbability: approvalProb,
      approvalProbabilityLabel: c.probability ? LENDER_PROBABILITY_LABELS[c.probability] : "Medium",
      momentumScore: momentum.score,
      momentumLabel: momentum.label,
      roi: roi.negotiatedRoi,
      etaDays,
      etaLabel: etaDays === 0 ? "Disbursed" : etaDays === 1 ? "1 Day" : `${etaDays} Days`,
      expectedRevenue: c.revenue ?? Math.round((loan.expectedRevenue / Math.max(mainLine.length, 1)) * (momentum.score / 100)),
      strategicPreference: strategicPreference(c, momentum.score),
      isPrimary: c.isPrimary,
      roiProfile: roi,
      momentumProfile: momentum,
    };
  });

  expressRows.sort((a, b) => b.confidenceScore - a.confidenceScore);

  const terminalOutcomes: TerminalOutcome[] = terminal.map((c) => {
    const s = normalizeLenderCaseStage(c.caseStage);
    return {
      lender: c.lender,
      lenderCaseId: c.id,
      outcome: s === "hold" ? "hold" : "lost",
      reason: c.holdReason ?? c.lostReason,
      since: c.updatedAt,
    };
  });

  const docsPct = docCompletionPct(loan);
  const tasksPct = taskCompletionPct(loan);
  const risk = buildRiskIntel(loan);
  const avgTat =
    mainLine.length === 0
      ? loan.daysInStage
      : Math.round(
          mainLine.reduce((sum, c) => sum + daysSinceUpdated(c.updatedAt), 0) / mainLine.length,
        );

  const bestRoi = roiProfiles[0];
  const lead = expressRows[0];
  const missionStatus = resolveMissionStatus(loan, cases);
  const expectedPayout = Math.round(loan.expectedRevenue * (loan.revenuePercent / 100));

  const principal = loan.finalLoanAmount ?? loan.requiredAmount;
  const tenure = loan.finalTenure ?? loan.tenure ?? 240;

  const kpis: ExecutiveKpis = {
    missionStatus,
    missionStatusLabel:
      missionStatus === "completed"
        ? "Completed"
        : missionStatus === "on_track"
          ? "On Track"
          : missionStatus === "at_risk"
            ? "At Risk"
            : "Critical",
    loanHealth: Math.round((docsPct + tasksPct + (lead?.momentumScore ?? 50) + risk.financialHealthScore) / 4),
    recommendationConfidence: lead?.confidenceScore ?? 0,
    bestRoi: bestRoi?.negotiatedRoi ?? loan.interestRate,
    bestRoiLender: bestRoi?.lender ?? "—",
    expectedRevenue: loan.expectedRevenue,
    expectedPayout,
    averageTat: avgTat,
    documentsCompletion: docsPct,
    tasksCompletion: tasksPct,
    riskScore: Math.min(100, Math.max(0, 100 - risk.policyCompliance + risk.exceptionCount * 12)),
  };

  const commercial: CommercialIntel = {
    scale,
    roiProfiles,
    savings,
    bestOfferLender: bestRoi?.lender ?? "—",
    emiComparisons: roiProfiles.map((r) => ({
      lender: r.lender,
      roi: r.negotiatedRoi,
      emi: computeMonthlyEmi(principal, r.negotiatedRoi, tenure),
    })),
    processingFees: roiProfiles.map((r) => {
      const fee = (r.negotiatedRoi / 100) * principal * 0.005;
      return { lender: r.lender, fee: Math.round(fee), feeLabel: formatPctFee(fee, principal) };
    }),
  };

  const stageCounts = new Map<string, number>();
  mainLine.forEach((c) => {
    const s = LENDER_CASE_STAGE_LABELS[normalizeLenderCaseStage(c.caseStage)];
    stageCounts.set(s, (stageCounts.get(s) ?? 0) + 1);
  });
  let bottleneck = "—";
  let maxCount = 0;
  stageCounts.forEach((count, stage) => {
    if (count > maxCount) {
      maxCount = count;
      bottleneck = stage;
    }
  });

  const idleLenders = mainLine
    .map((c) => ({ lender: c.lender, idleDays: daysSinceUpdated(c.updatedAt) }))
    .filter((x) => x.idleDays >= 3)
    .sort((a, b) => b.idleDays - a.idleDays);

  const execution: ExecutionIntel = {
    momentumProfiles,
    averageTat: avgTat,
    stageBottleneck: bottleneck,
    idleLenders,
    slaStatus: avgTat > 7 ? "breach" : avgTat > 4 ? "watch" : "within",
    followUpScore: Math.round(
      momentumProfiles.reduce((s, m) => s + m.breakdown.rmFollowUps, 0) / Math.max(momentumProfiles.length, 1),
    ),
    etaComparisons: expressRows.map((r) => ({ lender: r.lender, etaDays: r.etaDays })),
  };

  const bookedRevenue = loan.revenueReceived ?? Math.round(loan.expectedRevenue * 0.35);
  const margin = loan.expectedRevenue > 0 ? Math.round((expectedPayout / loan.expectedRevenue) * 100) : 0;

  const financial: FinancialIntel = {
    expectedRevenue: loan.expectedRevenue,
    bookedRevenue,
    expectedPayout,
    margin,
    profitability: margin >= 40 ? "strong" : margin >= 25 ? "moderate" : "thin",
    invoiceStatus: active.some((c) => c.invoiceRaised) ? "Raised" : "Pending",
    receivableStatus:
      loan.revenueReceived > 0 ? "Partially Received" : active.some((c) => c.paymentStatus === "received") ? "Received" : "Outstanding",
  };

  const participants = loan.participants?.length ?? (loan.coApplicant ? 2 : 1);
  const product = getProductByName(loan.loanProduct);
  const process: ProcessIntel = {
    timelineEvents: loan.timeline?.length ?? 0,
    timelineCompletion: Math.min(100, Math.round(((loan.timeline?.filter((e) => e.completed).length ?? 0) / Math.max(loan.timeline?.length ?? 1, 1)) * 100)),
    documentsCompletion: docsPct,
    tasksCompletion: tasksPct,
    participantCount: participants,
    propertyJourney: product?.isSecured
      ? loan.propertyType
        ? `${loan.propertyType} · ${loan.occupancyId ?? "Occupancy TBD"}`
        : "Property qualification in progress"
      : "Not applicable (unsecured)",
    workflowCompletion: Math.round((docsPct + tasksPct + (lead?.progressPct ?? 0)) / 3),
  };

  const attentionItems: string[] = [];
  terminalOutcomes.forEach((t) => {
    if (t.outcome === "hold") attentionItems.push(`${t.lender} on hold${t.reason ? `: ${t.reason}` : ""}.`);
  });
  idleLenders.forEach((i) => {
    attentionItems.push(`${i.lender} inactive for ${i.idleDays} days.`);
  });
  mainLine.forEach((c) => {
    if (c.caseSubStage?.toLowerCase().includes("valuation")) {
      attentionItems.push(`${c.lender} valuation pending.`);
    }
  });
  if (attentionItems.length === 0) attentionItems.push("No critical attention items.");

  const secondary = expressRows.find((r) => r.strategicPreference === "secondary");
  const briefing: ChanakyaBriefing = {
    missionStatus: kpis.missionStatusLabel,
    leadLender: lead?.lender ?? "—",
    confidence: lead?.confidenceScore ?? 0,
    approvalProbability: lead?.approvalProbability ?? 0,
    commercialWinner: bestRoi?.lender ?? "—",
    estimatedDisbursement: lead?.etaLabel ?? "—",
    attentionItems,
    recommendation: lead
      ? `Continue with ${lead.lender}${secondary ? `. Maintain ${secondary.lender} as secondary.` : "."}`
      : "Add lender cases to begin mission tracking.",
  };

  return {
    kpis,
    expressRows,
    terminalOutcomes,
    commercial,
    execution,
    risk,
    financial,
    process,
    briefing,
  };
}

export function sortExpressRows(rows: LenderExpressRow[], key: ExpressSortKey): LenderExpressRow[] {
  const sorted = [...rows];
  switch (key) {
    case "confidence":
      return sorted.sort((a, b) => b.confidenceScore - a.confidenceScore);
    case "roi":
      return sorted.sort((a, b) => a.roi - b.roi);
    case "momentum":
      return sorted.sort((a, b) => b.momentumScore - a.momentumScore);
    case "eta":
      return sorted.sort((a, b) => a.etaDays - b.etaDays);
    case "revenue":
      return sorted.sort((a, b) => b.expectedRevenue - a.expectedRevenue);
    case "probability":
      return sorted.sort((a, b) => b.approvalProbability - a.approvalProbability);
    default:
      return sorted;
  }
}

function formatPctFee(fee: number, principal: number): string {
  if (principal <= 0) return "—";
  const pct = (fee / principal) * 100;
  return `${pct.toFixed(2)}%`;
}

export { computeTotalInterest, STAGE_LABELS };

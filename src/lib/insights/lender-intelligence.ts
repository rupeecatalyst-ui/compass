import { LENDERS_BY_PRODUCT, type LenderOffer } from "@/lib/site";
import { getProductByName } from "@/constants/product-master";
import { getPublishedPolicies } from "@/lib/credit-risk-engine/policy-store";
import { normalizeLenderCaseStage } from "@/constants/lender-pipeline";
import type { LenderCaseStage, LoanFile, LoanLenderExecution } from "@/types/catalyst-one";

export type PolicyBandId = "excellent" | "preferred" | "acceptable" | "review" | "outside";

export interface PolicyBand {
  id: PolicyBandId;
  label: string;
  min: number;
  max: number;
  className: string;
}

export interface ProductRoiScale {
  productName: string;
  policyName: string;
  min: number;
  max: number;
  step: number;
  ticks: number[];
  bands: PolicyBand[];
}

export interface LenderRoiProfile {
  lenderCaseId: string;
  lender: string;
  policyRoi: number;
  offeredRoi: number;
  negotiatedRoi: number;
  band: PolicyBandId;
  rank?: 1 | 2 | 3;
  isPrimary?: boolean;
}

export type MomentumTrend = "improving" | "stable" | "declining";

export interface LenderMomentumProfile {
  lenderCaseId: string;
  lender: string;
  score: number;
  label: string;
  tone: "leading" | "strong" | "healthy" | "slow" | "attention" | "critical";
  trend: MomentumTrend;
  isPrimary?: boolean;
  breakdown: {
    stageProgress: number;
    recentProgress: number;
    rmFollowUps: number;
    bankResponse: number;
    documentCompletion: number;
    recentActivity: number;
  };
}

/** INS-02 — Configurable momentum weights (future admin override). */
export const MOMENTUM_WEIGHTS = {
  stageProgress: 0.4,
  recentProgress: 0.2,
  rmFollowUps: 0.15,
  bankResponse: 0.1,
  documentCompletion: 0.1,
  recentActivity: 0.05,
} as const;

const PRODUCT_SLUG_MAP: Record<string, string> = {
  "Home Loan": "home-loan",
  "Home Loan Balance Transfer": "home-loan-balance-transfer",
  "Loan Against Property": "loan-against-property",
  "Personal Loan": "personal-loan",
  "Business Loan (Unsecured)": "unsecured-business-loan",
  "Working Capital": "unsecured-business-loan",
};

const DEFAULT_SCALE_BY_SLUG: Record<string, { min: number; max: number; step: number }> = {
  "home-loan": { min: 6.0, max: 7.5, step: 0.25 },
  "home-loan-balance-transfer": { min: 6.0, max: 7.5, step: 0.25 },
  "loan-against-property": { min: 8.5, max: 10.5, step: 0.5 },
  "personal-loan": { min: 10, max: 14, step: 1 },
  "unsecured-business-loan": { min: 8, max: 10, step: 0.5 },
};

const RACE_STAGE_ORDER: LenderCaseStage[] = [
  "prelogin",
  "logged_in_wip",
  "soft_approved",
  "final_approved",
  "closure_wip",
  "disbursed",
  "hold",
  "lost",
];

const BAND_STYLES: Record<PolicyBandId, string> = {
  excellent: "bg-emerald-500/12 border-emerald-500/20",
  preferred: "bg-blue-500/10 border-blue-500/15",
  acceptable: "bg-slate-500/8 border-slate-500/15",
  review: "bg-amber-500/10 border-amber-500/20",
  outside: "bg-red-500/8 border-red-500/15",
};

function productSlug(productName: string): string {
  return PRODUCT_SLUG_MAP[productName] ?? "home-loan";
}

function buildTicks(min: number, max: number, step: number): number[] {
  const ticks: number[] = [];
  for (let v = min; v <= max + 0.001; v += step) {
    ticks.push(Math.round(v * 100) / 100);
  }
  return ticks;
}

function buildBands(min: number, max: number, step: number): PolicyBand[] {
  return [
    { id: "excellent", label: "Excellent", min, max: min + step, className: BAND_STYLES.excellent },
    {
      id: "preferred",
      label: "Preferred",
      min: min + step,
      max: min + step * 3,
      className: BAND_STYLES.preferred,
    },
    {
      id: "acceptable",
      label: "Acceptable",
      min: min + step * 3,
      max: min + step * 5,
      className: BAND_STYLES.acceptable,
    },
    {
      id: "review",
      label: "Review",
      min: min + step * 5,
      max: max - step,
      className: BAND_STYLES.review,
    },
    { id: "outside", label: "Outside Policy", min: max - step, max: max + step * 2, className: BAND_STYLES.outside },
  ];
}

function matchLenderOffer(lenderName: string, offers: LenderOffer[]): LenderOffer | undefined {
  const norm = lenderName.toLowerCase();
  return offers.find((o) => {
    const on = o.name.toLowerCase();
    return on.includes(norm.split(" ")[0]!) || norm.includes(on.split(" ")[0]!);
  });
}

function lenderVariance(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 1000;
  return (h % 40) / 100;
}

function daysSince(iso: string) {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return 0;
  return Math.floor((Date.now() - d) / (24 * 60 * 60 * 1000));
}

function stageIndex(stage: LenderCaseStage): number {
  const idx = RACE_STAGE_ORDER.indexOf(stage);
  return idx >= 0 ? idx : 0;
}

export function resolveProductRoiScale(loan: LoanFile): ProductRoiScale {
  const slug = productSlug(loan.loanProduct);
  const offers = LENDERS_BY_PRODUCT[slug] ?? [];
  const product = getProductByName(loan.loanProduct);
  const policies = getPublishedPolicies().filter(
    (p) =>
      p.productName.toLowerCase() === loan.loanProduct.toLowerCase() ||
      p.productId === product?.id,
  );
  const policyName = policies[0]?.policyName ?? `${loan.loanProduct} — Standard Policy`;

  let min: number;
  let max: number;
  let step: number;

  if (offers.length > 0) {
    const rates = offers.map((o) => o.rateNum);
    min = Math.floor(Math.min(...rates) * 4) / 4;
    max = Math.ceil(Math.max(...rates) * 4) / 4;
    step = slug.includes("home") ? 0.25 : slug === "personal-loan" ? 1 : 0.5;
    min = Math.max(min - step, min);
    max = max + step;
  } else {
    const fallback = DEFAULT_SCALE_BY_SLUG[slug] ?? DEFAULT_SCALE_BY_SLUG["home-loan"]!;
    min = fallback.min;
    max = fallback.max;
    step = fallback.step;
  }

  return {
    productName: loan.loanProduct,
    policyName,
    min,
    max,
    step,
    ticks: buildTicks(min, max, step),
    bands: buildBands(min, max, step),
  };
}

export function classifyRoiBand(roi: number, scale: ProductRoiScale): PolicyBandId {
  for (const band of scale.bands) {
    if (roi >= band.min && roi < band.max) return band.id;
  }
  return roi <= scale.min ? "excellent" : "outside";
}

export function buildLenderRoiProfiles(
  loan: LoanFile,
  cases: LoanLenderExecution[],
  scale: ProductRoiScale,
): LenderRoiProfile[] {
  const slug = productSlug(loan.loanProduct);
  const offers = LENDERS_BY_PRODUCT[slug] ?? [];
  const active = cases.filter((c) => c.status !== "closed");

  const profiles: LenderRoiProfile[] = active.map((c) => {
    const offer = matchLenderOffer(c.lender, offers);
    const policyRoi = offer?.rateNum ?? loan.interestRate;
    const offeredRoi =
      c.finalRoi != null
        ? Math.round((c.finalRoi + 0.2 + lenderVariance(c.id)) * 100) / 100
        : Math.round((policyRoi + lenderVariance(c.lender)) * 100) / 100;

    const stage = normalizeLenderCaseStage(c.caseStage);
    const negotiatedRoi =
      c.finalRoi ??
      (stageIndex(stage) >= stageIndex("soft_approved")
        ? Math.round((offeredRoi - 0.15 - lenderVariance(`${c.id}-neg`) * 0.1) * 100) / 100
        : offeredRoi);

    const band = classifyRoiBand(negotiatedRoi, scale);

    return {
      lenderCaseId: c.id,
      lender: c.lender,
      policyRoi,
      offeredRoi,
      negotiatedRoi,
      band,
      isPrimary: c.isPrimary,
    };
  });

  const ranked = [...profiles].sort((a, b) => a.negotiatedRoi - b.negotiatedRoi);
  ranked.forEach((p, i) => {
    if (i < 3) {
      const target = profiles.find((x) => x.lenderCaseId === p.lenderCaseId);
      if (target) target.rank = (i + 1) as 1 | 2 | 3;
    }
  });

  return profiles.sort((a, b) => a.negotiatedRoi - b.negotiatedRoi);
}

export function roiToPercent(roi: number, scale: ProductRoiScale): number {
  const range = scale.max - scale.min;
  if (range <= 0) return 0;
  return Math.min(100, Math.max(0, ((roi - scale.min) / range) * 100));
}

export function computeTotalInterest(principal: number, annualRate: number, tenureMonths: number): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return 0;
  const factor = Math.pow(1 + r, tenureMonths);
  const emi = (principal * r * factor) / (factor - 1);
  return Math.round(emi * tenureMonths - principal);
}

export function computeInterestSavings(
  loan: LoanFile,
  profiles: LenderRoiProfile[],
  selectedCaseId?: string,
): { amount: number; bestLender: string; compareLender: string; tenureMonths: number } | null {
  if (profiles.length < 2) return null;

  const sorted = [...profiles].sort((a, b) => a.negotiatedRoi - b.negotiatedRoi);
  const best = sorted[0]!;
  const worst = sorted[sorted.length - 1]!;
  const selected =
    profiles.find((p) => p.lenderCaseId === selectedCaseId) ??
    profiles.find((p) => p.isPrimary) ??
    best;

  if (selected.negotiatedRoi >= worst.negotiatedRoi) return null;

  const principal = loan.finalLoanAmount ?? loan.requiredAmount ?? loan.loanAmount;
  const tenureMonths = loan.finalTenure ?? loan.tenure ?? 240;
  const saving = computeTotalInterest(principal, worst.negotiatedRoi, tenureMonths)
    - computeTotalInterest(principal, selected.negotiatedRoi, tenureMonths);

  return {
    amount: Math.max(0, saving),
    bestLender: selected.lender,
    compareLender: worst.lender,
    tenureMonths,
  };
}

function momentumLabel(score: number): { label: string; tone: LenderMomentumProfile["tone"] } {
  if (score >= 90) return { label: "Leading", tone: "leading" };
  if (score >= 80) return { label: "Strong", tone: "strong" };
  if (score >= 65) return { label: "Healthy", tone: "healthy" };
  if (score >= 45) return { label: "Slow", tone: "slow" };
  if (score >= 25) return { label: "Needs Attention", tone: "attention" };
  return { label: "Critical", tone: "critical" };
}

function resolveTrend(c: LoanLenderExecution): MomentumTrend {
  const stage = normalizeLenderCaseStage(c.caseStage);
  const idle = daysSince(c.updatedAt);
  if (stage === "hold" || stage === "lost") return "declining";
  if (idle >= 4) return "declining";
  if (idle <= 2 && stageIndex(stage) >= stageIndex("soft_approved")) return "improving";
  if (idle <= 1) return "improving";
  return "stable";
}

export function buildLenderMomentumProfiles(
  loan: LoanFile,
  cases: LoanLenderExecution[],
): LenderMomentumProfile[] {
  const active = cases.filter((c) => c.status !== "closed");
  const docs = loan.documents ?? [];
  const docCompletePct =
    docs.length === 0
      ? 50
      : (docs.filter((d) => d.status === "received" || d.status === "verified").length / docs.length) * 100;

  const profiles = active.map((c) => {
    const stage = normalizeLenderCaseStage(c.caseStage);
    const idx = stageIndex(stage);
    const idle = daysSince(c.updatedAt);
    const maxIdx = stageIndex("disbursed");

    let stageProgress = (idx / maxIdx) * 100;
    if (stage === "lost") stageProgress = 5;
    if (stage === "hold") stageProgress *= 0.6;

    const recentProgress =
      idle <= 1 ? 95 : idle <= 3 ? 75 : idle <= 5 ? 50 : idle <= 7 ? 30 : 10;

    const rmFollowUps =
      c.relationshipManager && c.relationshipManager === loan.relationshipManager
        ? idle <= 3
          ? 90
          : 55
        : c.relationshipManager
          ? 70
          : 40;

    const bankResponse =
      stage === "logged_in_wip"
        ? idle <= 2
          ? 85
          : idle <= 5
            ? 55
            : 25
        : idx >= stageIndex("soft_approved")
          ? 80
          : 60;

    const documentCompletion = docCompletePct;
    const recentActivity = idle <= 2 ? 90 : idle <= 4 ? 60 : 20;

    const w = MOMENTUM_WEIGHTS;
    const score = Math.round(
      stageProgress * w.stageProgress +
        recentProgress * w.recentProgress +
        rmFollowUps * w.rmFollowUps +
        bankResponse * w.bankResponse +
        documentCompletion * w.documentCompletion +
        recentActivity * w.recentActivity,
    );

    const { label, tone } = momentumLabel(score);
    const trend = resolveTrend(c);

    return {
      lenderCaseId: c.id,
      lender: c.lender,
      score,
      label,
      tone,
      trend,
      isPrimary: c.isPrimary,
      breakdown: {
        stageProgress: Math.round(stageProgress),
        recentProgress: Math.round(recentProgress),
        rmFollowUps: Math.round(rmFollowUps),
        bankResponse: Math.round(bankResponse),
        documentCompletion: Math.round(documentCompletion),
        recentActivity: Math.round(recentActivity),
      },
    };
  });

  return profiles.sort((a, b) => b.score - a.score);
}

export function buildExecutiveSummary(
  loan: LoanFile,
  roiProfiles: LenderRoiProfile[],
  momentumProfiles: LenderMomentumProfile[],
): string {
  if (roiProfiles.length === 0 && momentumProfiles.length === 0) {
    return `Loan ${loan.fileNumber} — add lender cases to generate executive intelligence.`;
  }

  const bestRoi = roiProfiles[0];
  const topMomentum = momentumProfiles[0];
  const parts: string[] = [];

  if (bestRoi && topMomentum) {
    if (bestRoi.lender === topMomentum.lender) {
      parts.push(
        `${bestRoi.lender} currently offers the most competitive ROI while also leading the Momentum Index.`,
      );
    } else {
      parts.push(
        `${bestRoi.lender} currently offers the most competitive ROI while ${topMomentum.lender} leads the Momentum Index.`,
      );
    }
  }

  const steady = momentumProfiles.filter((m) => m.tone === "healthy" || m.tone === "strong");
  steady.slice(0, 2).forEach((m) => {
    if (m.lender !== topMomentum?.lender) {
      parts.push(`${m.lender} is progressing steadily.`);
    }
  });

  const slow = momentumProfiles.filter((m) => m.tone === "slow" || m.tone === "attention");
  slow.forEach((m) => {
    const roi = roiProfiles.find((r) => r.lenderCaseId === m.lenderCaseId);
    if (roi && roi.negotiatedRoi > (bestRoi?.negotiatedRoi ?? 0) + 0.3) {
      parts.push(
        `${m.lender} offers a higher ROI and has ${m.trend === "declining" ? "slowed considerably" : "lost momentum"}.`,
      );
    } else if (m.tone === "attention") {
      parts.push(`${m.lender} requires RM attention.`);
    }
  });

  const primary = roiProfiles.find((r) => r.isPrimary) ?? bestRoi;
  const secondary = momentumProfiles.find(
    (m) => m.lender !== primary?.lender && (m.tone === "strong" || m.tone === "healthy"),
  );

  if (primary) {
    let rec = `Recommendation: Continue with ${primary.lender} as Primary`;
    if (secondary) rec += ` while maintaining ${secondary.lender} as secondary.`;
    else rec += ".";
    parts.push(rec);
  }

  return parts.join(" ");
}

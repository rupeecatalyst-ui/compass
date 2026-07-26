/**
 * CO-UX-024 — Module-scoped CHANAKYA Insight catalogs for loading surfaces.
 * Copy is educational / motivational — never generic “Loading…”.
 */

import type { ChanakyaLoadingModule } from "@/types/chanakya-loading";

export const CHANAKYA_LOADING_INSIGHTS: Record<
  ChanakyaLoadingModule,
  readonly string[]
> = {
  contacts: [
    "Every contact is a future opportunity. Keep your network alive.",
    "Strong relationships create stronger businesses.",
    "The next large transaction often starts with a simple conversation.",
    "Every meaningful follow-up builds long-term trust.",
    "Don't just collect contacts. Build relationships.",
  ],
  opportunity: [
    "Qualify thoroughly before approaching lenders.",
    "A well-prepared Opportunity receives faster approvals.",
    "The right lender is chosen through analysis, not assumption.",
    "Complete documentation today saves valuable time tomorrow.",
    "Every Opportunity deserves a strategy before execution.",
  ],
  deal: [
    "Momentum wins Deals. Keep every Deal moving.",
    "Every day in one stage increases execution risk.",
    "Follow-up creates progress.",
    "The fastest Deal is the one that never stops moving.",
    "Execution discipline creates successful disbursals.",
  ],
  customers: [
    "Understand the customer before recommending a solution.",
    "Financial advice begins with listening.",
    "Every customer deserves clarity and transparency.",
    "Know the person behind the requirement.",
    "Trust grows when guidance stays clear and honest.",
  ],
  lenders: [
    "Every lender has different strengths. Match wisely.",
    "The best lender is not always the fastest lender.",
    "Relationships with lenders are built over consistent execution.",
    "Fit the product to the lender — never the other way around.",
    "Lender discipline compounds into faster disbursals.",
  ],
  accounting: [
    "Clean accounting creates a healthy business.",
    "Every invoice tells the story of completed execution.",
    "Timely reconciliation protects profitability.",
    "Accuracy today prevents disputes tomorrow.",
    "Financial clarity strengthens every decision.",
  ],
  "mission-control": [
    "Great leaders monitor trends before they become problems.",
    "Measure consistently. Improve continuously.",
    "Business grows where attention goes.",
    "Visibility turns risk into action.",
    "Operational calm comes from continuous awareness.",
  ],
  dashboard: [
    "Great leaders monitor trends before they become problems.",
    "Measure consistently. Improve continuously.",
    "Business grows where attention goes.",
    "Start the day with clarity. End it with progress.",
    "Prioritise what moves the pipeline forward.",
  ],
  documents: [
    "Complete documentation today saves valuable time tomorrow.",
    "Clean files move faster through every lender.",
    "Missing papers create avoidable delays.",
    "Verification quality protects the customer journey.",
  ],
  credit: [
    "Qualify thoroughly before approaching lenders.",
    "Credit clarity accelerates lender confidence.",
    "A structured assessment prevents late-stage surprises.",
    "Strong credit preparation shortens the approval cycle.",
  ],
  enterprise: [
    "Momentum wins Deals. Keep every Deal moving.",
    "Strong relationships create stronger businesses.",
    "Measure consistently. Improve continuously.",
    "Execution discipline creates successful disbursals.",
    "Business grows where attention goes.",
  ],
} as const;

export function getChanakyaLoadingInsights(
  module: ChanakyaLoadingModule,
): readonly string[] {
  return CHANAKYA_LOADING_INSIGHTS[module] ?? CHANAKYA_LOADING_INSIGHTS.enterprise;
}

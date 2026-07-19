/**
 * Analyze Deal Workspace — UI / architecture contracts (Phase 1).
 * No eligibility, income, or credit engines — mock recommendations only.
 */

export type AnalyzeDealCibilBand = import("@/types/cibil-score-master").ApproxCibilScoreBand;

export type AnalyzeDealCustomerCategory =
  | "salaried"
  | "self_employed_professional"
  | "self_employed_business"
  | "nri";

export interface AnalyzeDealLowScoreContext {
  activeOverdue: boolean | null;
  loanOverdue: boolean | null;
  creditCardOverdue: boolean | null;
  settledAccount: boolean | null;
  writtenOffAccount: boolean | null;
}

export interface AnalyzeDealInputs {
  productId: string;
  productLabel: string;
  customerCategory: AnalyzeDealCustomerCategory | "";
  requestedAmount: string;
  propertyValue: string;
  /** Salaried family */
  monthlyIncome: string;
  employer: string;
  salaryCredits: string;
  /** Self-employed family */
  businessTurnover: string;
  businessVintage: string;
  gst: string;
  itr: string;
  banking: string;
  profit: string;
  rentalIncome: string;
  /** Shared */
  existingEmi: string;
  cibilBand: AnalyzeDealCibilBand | "";
  lowScore: AnalyzeDealLowScoreContext;
  notes: string;
}

export interface AnalyzeDealRmContact {
  name: string;
  designation: string;
  mobile: string;
  email: string;
  photoInitials: string;
  photoUrl?: string | null;
}

export interface AnalyzeDealLenderRecommendation {
  lenderId: string;
  lenderName: string;
  logoInitials: string;
  confidencePct: number;
  productId: string;
  productLabel: string;
  programLabel: string;
  status: "strong_fit" | "good_fit" | "review";
  whyThisLender: string;
  improvements: string[];
  rm: AnalyzeDealRmContact;
}

export interface AnalyzeDealResult {
  analyzedAt: string;
  overallConfidencePct: number;
  recommendations: AnalyzeDealLenderRecommendation[];
  improvementSuggestions: string[];
}

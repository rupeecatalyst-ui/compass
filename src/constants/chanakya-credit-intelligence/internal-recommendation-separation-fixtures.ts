/**
 * Regression fixtures — internal recommendation separation (CO-CHANAKYA-CERTIFICATION-020A).
 */

import type { InternalRecommendationLeakCandidate } from "@/lib/chanakya-credit-intelligence/internal-recommendation-separation";

export interface InternalRecommendationSeparationFixture {
  id: string;
  internalRecommendations: InternalRecommendationLeakCandidate[];
  lenderText: string;
  expectLeak: boolean;
}

/** Verbatim internal desk copy in lender draft → must FAIL. */
export const INTERNAL_REC_SEPARATION_GENUINE_LEAK_FIXTURE: InternalRecommendationSeparationFixture =
  {
    id: "genuine-internal-rec-leak",
    internalRecommendations: [
      {
        id: "rec:committee",
        recommendation:
          "Escalate to credit committee before lender submission — internal readiness review required.",
        internalOnly: true,
      },
    ],
    lenderText:
      "Facility summary for the lender.\nEscalate to credit committee before lender submission — internal readiness review required.\nEnd of memo.",
    expectLeak: true,
  };

/** Shared evidence gap wording with different tail → must PASS. */
export const INTERNAL_REC_SEPARATION_HARMLESS_SHARED_EVIDENCE_FIXTURE: InternalRecommendationSeparationFixture =
  {
    id: "harmless-shared-evidence-wording",
    internalRecommendations: [
      {
        id: "rec:bank_statements",
        recommendation: "Obtain readable bank statements for the review period.",
        internalOnly: true,
      },
    ],
    lenderText:
      "**Outstanding verification items:**\n- Obtain readable bank statements for transaction-level banking assessment.",
    expectLeak: false,
  };

export const INTERNAL_REC_SEPARATION_FIXTURES: InternalRecommendationSeparationFixture[] = [
  INTERNAL_REC_SEPARATION_GENUINE_LEAK_FIXTURE,
  INTERNAL_REC_SEPARATION_HARMLESS_SHARED_EVIDENCE_FIXTURE,
];

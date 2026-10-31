/**
 * CO-LENDER-ARCH-001 — Rank Published Enterprise Lenders for Chanakya / LIFE.
 * SSOT: Enterprise Lender Registry only. Never demo contact lists or hardcoded banks.
 */
import { ensureLenderMasterBootstrapped } from "@/lib/enterprise-lender-registry/bootstrap-master";
import {
  isCanonicalDealLenderOption,
  listCanonicalEnterpriseLenderOptionsAsync,
  listPublishedLenderOptions,
  type PublishedLenderOption,
} from "@/lib/enterprise-lender-registry/published-directory";
import { dedupeLendersForSelection } from "@/lib/enterprise-lender-registry/presentation-canonical";
import type { LoanFile } from "@/types/catalyst-one";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { isPublishedCommercialProgram } from "@/lib/enterprise-lender-registry/program-architecture";
import { recommendationProgrammeIds } from "@/lib/enterprise-lender-registry/programme-versioning";
import {
  matchPublishedProgramme,
  type ProgrammeMatchInput,
} from "@/lib/product-programme-operations/match-published";
import { canonicalizeProductCode } from "@/lib/product-programme-operations/product-aliases";
import { approxCibilBandToLowerBound } from "@/lib/product-programme-operations/cibil-band";

export type RegistryLenderRecommendation = {
  rank: number;
  /** Enterprise Lender Registry primary key */
  enterpriseLenderId: string;
  lenderCode: string;
  lenderName: string;
  /** Stable ref for shortlist / Move to Deal: lender:{registryId} */
  lenderRef: string;
  score: number;
  confidencePct: number;
  stars: number;
  reason: string;
  classification?: string | null;
  institutionCategory: string;
  programmeId?: string;
  programmeVersion?: number;
  unavailableReason?: string;
};

/** Customer residency values. Programme "not applicable" and contact defaults are not customer facts. */
export type CustomerResidencyFact = "resident" | "nri" | "pio";

/**
 * Opportunity facts already on EnterpriseOpportunity.
 * Residency is accepted only as resident, nri, or pio. State is the stored state, not a city inference.
 */
export type LoanFileOpportunityMatchFacts = {
  residency?: string | null;
  borrowerLegalConstitution?: string | null;
  state?: string | null;
};

export function acceptedCustomerResidency(value: string | null | undefined): CustomerResidencyFact | null {
  const raw = (value ?? "").trim().toLowerCase();
  if (raw === "resident" || raw === "nri" || raw === "pio") return raw;
  return null;
}

function recordedFact(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  return raw || null;
}

export function matchInputFromLoanFile(
  file: LoanFile,
  facts?: LoanFileOpportunityMatchFacts,
): ProgrammeMatchInput {
  const input: ProgrammeMatchInput = {
    productCode: canonicalizeProductCode(file.loanProduct) ?? file.loanProduct,
    employmentType: file.employmentType,
    constitution: file.businessDetails?.constitution ?? null,
    residency: null,
    loanAmountExact: file.loanAmount != null ? String(Math.round(file.loanAmount)) + ".00" : null,
    cibil: approxCibilBandToLowerBound(file.approxCibilScore),
    city: file.city ?? null,
    transactionType: file.transactionType ?? null,
    propertyType: file.propertyType ?? null,
    propertyCategory: file.propertyCategory ?? null,
    constructionStatus: file.constructionStatus ?? null,
  };
  if (!facts) return input;
  return {
    ...input,
    constitution: recordedFact(facts.borrowerLegalConstitution),
    residency: acceptedCustomerResidency(facts.residency),
    state: recordedFact(facts.state),
  };
}

const UNVERIFIED_PROGRAMME_FACT = /^(.+) was not available, so this programme rule was not verified\.$/;

export type LoanFileProgrammeMatchReport = {
  kind: "information_required" | "ineligible" | "no_published_programme";
  missingFacts: string[];
  reasons: string[];
};

function currentMatchProgrammes(programmes: EnterpriseLenderProgramRecord[]): EnterpriseLenderProgramRecord[] {
  const allowed = recommendationProgrammeIds(programmes);
  return programmes.filter((program) => allowed.has(program.id) && isPublishedCommercialProgram(program));
}

/** Classify an empty loan-file result without changing match or rank rules. */
export function reportLoanFileProgrammeMatches(
  programmes: EnterpriseLenderProgramRecord[],
  file: LoanFile,
  facts: LoanFileOpportunityMatchFacts,
): LoanFileProgrammeMatchReport {
  const noPublished = "No applicable published programme matched this Opportunity. Category heuristics were not used.";
  const current = currentMatchProgrammes(programmes);
  if (current.length === 0) {
    return { kind: "no_published_programme", missingFacts: [], reasons: [noPublished] };
  }
  const input = matchInputFromLoanFile(file, facts);
  const missingFacts: string[] = [];
  const unverified: string[] = [];
  const other: string[] = [];
  for (const program of current) {
    const result = matchPublishedProgramme(program, input);
    if (result.matched) continue;
    const fact = UNVERIFIED_PROGRAMME_FACT.exec(result.reason);
    if (fact?.[1]) {
      if (!missingFacts.includes(fact[1])) missingFacts.push(fact[1]);
      if (!unverified.includes(result.reason)) unverified.push(result.reason);
    } else if (!other.includes(result.reason)) {
      other.push(result.reason);
    }
  }
  if (missingFacts.length > 0) {
    return { kind: "information_required", missingFacts, reasons: unverified };
  }
  const ineligible = other.filter((reason) => reason.includes("outside programme"));
  if (ineligible.length > 0) {
    return { kind: "ineligible", missingFacts: [], reasons: ineligible };
  }
  if (other.length > 0) {
    return { kind: "no_published_programme", missingFacts: [], reasons: other };
  }
  return { kind: "no_published_programme", missingFacts: [], reasons: [noPublished] };
}

function scoreLender(
  lender: PublishedLenderOption,
  file: LoanFile,
  programme?: EnterpriseLenderProgramRecord | null,
  matchInput?: ProgrammeMatchInput,
): { score: number; reason: string } {
  if (programme) {
    const match = matchPublishedProgramme(programme, matchInput ?? matchInputFromLoanFile(file));
    if (!match.matched) {
      return { score: 0, reason: match.reason };
    }
    return {
      score: 88,
      reason: `${match.reason} Policy ${programme.policyVersionId ?? programme.creditRiskPolicyRef ?? "mapped"}.`,
    };
  }
  return {
    score: 0,
    reason: "No applicable published programme is available. A category heuristic was not used.",
  };
}

function starsFromRank(rank: number, confidencePct: number): number {
  if (rank === 1) return 5;
  if (rank === 2) return 4;
  if (rank === 3) return confidencePct >= 70 ? 3 : 2;
  if (confidencePct >= 80) return 3;
  if (confidencePct >= 65) return 2;
  return 1;
}

/**
 * Rank Published + Active lenders from Enterprise Lender Registry.
 * Unpublished lenders are never included.
 * CO-LR-008 — presentation-dedupe warm session (sync); prefer async API for AI / LIFE.
 */
export function recommendPublishedLendersFromRegistry(input: {
  file: LoanFile;
  limit?: number;
  opportunityFacts?: LoanFileOpportunityMatchFacts;
}): RegistryLenderRecommendation[] {
  if (typeof window !== "undefined") {
    ensureLenderMasterBootstrapped();
  }
  const limit = input.limit ?? 8;
  // Prefer warm session only when it already holds canonical API rows; otherwise empty
  // until async Manual / Move paths hydrate from Prisma.
  const options = dedupeLendersForSelection(
    listPublishedLenderOptions()
      .filter(isCanonicalDealLenderOption)
      .map((o) => ({
        ...o,
        label: (o.displayName || o.code || "").trim() || o.id,
      })),
  );
  if (options.length === 0) return [];
  return scoreAndRank(
    options,
    input.file,
    limit,
    [],
    input.opportunityFacts ? matchInputFromLoanFile(input.file, input.opportunityFacts) : undefined,
  );
}

/** CO-LR-008 — AI / Chanakya recommendations from Prisma Registry only (browser / employee UI). */
export async function recommendPublishedLendersFromRegistryAsync(input: {
  file: LoanFile;
  limit?: number;
  programmes?: EnterpriseLenderProgramRecord[];
  opportunityFacts?: LoanFileOpportunityMatchFacts;
}): Promise<RegistryLenderRecommendation[]> {
  const limit = input.limit ?? 8;
  const options = await listCanonicalEnterpriseLenderOptionsAsync();
  if (options.length === 0) return [];
  let programmes = input.programmes ?? [];
  if (programmes.length === 0) {
    try {
      const res = await authenticatedJsonFetch("/api/lender-registry/programs?pageSize=500&status=active&enabled=true");
      const body = await res.json().catch(() => ({}));
      const items = Array.isArray(body?.data?.items) ? body.data.items : [];
      programmes = items.filter(
        (p: EnterpriseLenderProgramRecord) =>
          p.isLivePublished === true &&
          p.publicationState === "published" &&
          p.completenessState === "complete",
      );
    } catch {
      programmes = [];
    }
  }
  return recommendPublishedLendersFromOptions(options, { ...input, programmes, limit });
}

/**
 * CO-WP-LENDER-API-002 — Rank from pre-loaded Registry options.
 * Partner Gateway must supply options via Prisma (never relative /api/lender-registry HTTP).
 */
export function recommendPublishedLendersFromOptions(
  options: PublishedLenderOption[],
  input: {
    file: LoanFile;
    limit?: number;
    programmes?: EnterpriseLenderProgramRecord[];
    /** When supplied, this is the only matcher input. Missing facts stay missing. */
    matchInput?: ProgrammeMatchInput;
    /** Used only when matchInput is omitted and the caller already holds the Opportunity record. */
    opportunityFacts?: LoanFileOpportunityMatchFacts;
  },
): RegistryLenderRecommendation[] {
  const limit = input.limit ?? 8;
  const canonical = options.filter(isCanonicalDealLenderOption);
  if (canonical.length === 0) return [];
  const allowed = recommendationProgrammeIds(input.programmes ?? []);
  const programmes = (input.programmes ?? []).filter(
    (program) => allowed.has(program.id) && isPublishedCommercialProgram(program),
  );
  const matchInput =
    input.matchInput ??
    (input.opportunityFacts ? matchInputFromLoanFile(input.file, input.opportunityFacts) : undefined);
  return scoreAndRank(canonical, input.file, limit, programmes, matchInput);
}

function scoreAndRank(
  options: PublishedLenderOption[],
  file: LoanFile,
  limit: number,
  programmes: EnterpriseLenderProgramRecord[],
  matchInput?: ProgrammeMatchInput,
): RegistryLenderRecommendation[] {
  const input = matchInput ?? matchInputFromLoanFile(file);
  const scored = options.map((lender) => {
    const programme =
      programmes.find((item) => {
        if (item.lenderId !== lender.id) return false;
        return matchPublishedProgramme(item, input).matched;
      }) ?? null;
    const { score, reason } = scoreLender(lender, file, programme, input);
    return { lender, score, reason, programme };
  });

  return scored
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.lender.displayName.localeCompare(b.lender.displayName))
    .slice(0, limit)
    .map((row, index) => {
      const rank = index + 1;
      const confidencePct = Math.max(55, Math.min(96, Math.round(row.score)));
      return {
        rank,
        enterpriseLenderId: row.lender.id,
        lenderCode: row.lender.code,
        lenderName: row.lender.displayName || row.lender.code,
        lenderRef: `lender:${row.lender.id}`,
        score: Math.round(row.score),
        confidencePct,
        stars: starsFromRank(rank, confidencePct),
        reason: row.reason,
        classification: row.lender.classification,
        institutionCategory: row.lender.institutionCategory,
        programmeId: row.programme?.id,
        programmeVersion: row.programme?.versionNumber,
      };
    });
}

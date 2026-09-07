import { resolveProgrammeDocumentSurface, resolveProgrammePolicySurface } from "@/lib/product-programme-operations/policy-surface";
import { citePublishedProgramme } from "@/lib/product-programme-operations/proposal-citation";
import { isPublishedCommercialProgram } from "@/lib/enterprise-lender-registry/program-architecture";
import { isLegacyProgrammeReviewRequired } from "@/lib/product-programme-operations/legacy-review";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";

export type ChanakyaProgrammeEvidence = {
  available: boolean;
  programmeId: string | null;
  programmeCode: string | null;
  programmeVersion: number | null;
  policyLabel: string;
  documentLabel: string;
  reason: string;
  citation: ReturnType<typeof citePublishedProgramme> | null;
};

export function buildChanakyaProgrammeEvidence(
  program: EnterpriseLenderProgramRecord | null | undefined,
): ChanakyaProgrammeEvidence {
  if (!program) {
    return {
      available: false,
      programmeId: null,
      programmeCode: null,
      programmeVersion: null,
      policyLabel: "Not mapped",
      documentLabel: "Not mapped",
      reason: "No published programme is available for this lender and product.",
      citation: null,
    };
  }
  if (!isPublishedCommercialProgram(program)) {
    const policy = resolveProgrammePolicySurface({ program });
    const legacy = isLegacyProgrammeReviewRequired(program);
    return {
      available: false,
      programmeId: program.id,
      programmeCode: program.code,
      programmeVersion: program.versionNumber,
      policyLabel: policy.label,
      documentLabel: resolveProgrammeDocumentSurface(
        Array.isArray(program.requiredDocuments)
          ? program.requiredDocuments.length
          : (program.requiredDocumentTypeIds ?? []).length,
      ).label,
      reason: legacy
        ? "Legacy programme — review required. Not available for recommendation until republished."
        : `Programme ${program.code} is ${program.publicationState ?? program.status}, not a live published commercial programme.`,
      citation: null,
    };
  }
  const citation = citePublishedProgramme(program);
  return {
    available: true,
    programmeId: program.id,
    programmeCode: program.code,
    programmeVersion: program.versionNumber,
    policyLabel: resolveProgrammePolicySurface({ program }).label,
    documentLabel: resolveProgrammeDocumentSurface(
      citation.requiredDocuments.length,
    ).label,
    reason: `Using published programme ${program.code} v${program.versionNumber}.`,
    citation,
  };
}

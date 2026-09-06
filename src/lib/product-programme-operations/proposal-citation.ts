import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";

export type ProgrammeCitation = {
  lenderId: string;
  programmeId: string;
  programmeCode: string;
  programmeVersion: number;
  policyVersionId: string | null;
  roiRange: string | null;
  eligibilityBasis: string;
  requiredDocuments: string[];
  effectiveFrom: string | null;
};

export function citePublishedProgramme(program: EnterpriseLenderProgramRecord): ProgrammeCitation {
  const roi =
    program.minRoiExact && program.maxRoiExact
      ? `${program.minRoiExact}–${program.maxRoiExact}%`
      : program.minRoiExact || program.maxRoiExact
        ? `${program.minRoiExact ?? "n/a"}–${program.maxRoiExact ?? "n/a"}%`
        : null;
  return {
    lenderId: program.lenderId,
    programmeId: program.id,
    programmeCode: program.code,
    programmeVersion: program.versionNumber,
    policyVersionId: program.policyVersionId ?? program.creditRiskPolicyRef ?? null,
    roiRange: roi,
    eligibilityBasis: [
      (program.employmentTypes ?? []).join("/"),
      (program.legalConstitutions ?? []).join("/"),
    ]
      .filter(Boolean)
      .join(" · ") || "Published programme eligibility",
    requiredDocuments: program.requiredDocumentTypeIds ?? [],
    effectiveFrom: program.effectiveFrom ?? null,
  };
}

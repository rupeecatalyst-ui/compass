import {
  ProgrammeConflictError,
  type ProgrammeVersionRecord,
} from "@/types/product-programme-operations";

export function isLivePublishedProgramme(record: Pick<ProgrammeVersionRecord, "isLivePublished" | "publicationState" | "isDeleted">): boolean {
  return !record.isDeleted && record.isLivePublished && record.publicationState === "published";
}

export function assertPublishedNotOverwritten(
  existing: Pick<ProgrammeVersionRecord, "publicationState" | "isLivePublished" | "id">,
  createDraftRevision: boolean,
): void {
  if (existing.publicationState === "published" && existing.isLivePublished && !createDraftRevision) {
    throw new ProgrammeConflictError(
      `Published programme ${existing.id} cannot be overwritten. Create a draft revision instead.`,
    );
  }
}

export function assertLockVersion(
  existing: Pick<ProgrammeVersionRecord, "lockVersion" | "id">,
  expectedLockVersion: number | undefined,
): void {
  if (expectedLockVersion == null) return;
  if (existing.lockVersion !== expectedLockVersion) {
    throw new ProgrammeConflictError(
      `Programme ${existing.id} was modified concurrently (lock ${existing.lockVersion}, expected ${expectedLockVersion}).`,
    );
  }
}

export function nextDraftVersionNumber(publishedVersionNumber: number): number {
  return publishedVersionNumber + 1;
}

export function classifyIncompleteStub(input: {
  policyVersionId?: string | null;
  creditRiskPolicyRef?: string | null;
  requiredDocumentTypeIds?: string[] | null;
  minRoiExact?: string | null;
  maxRoiExact?: string | null;
}): { completenessState: "incomplete" | "complete"; shouldDemoteFromPublished: boolean } {
  const hasPolicy = Boolean((input.policyVersionId ?? "").trim() || (input.creditRiskPolicyRef ?? "").trim());
  const hasLod = Array.isArray(input.requiredDocumentTypeIds) && input.requiredDocumentTypeIds.length > 0;
  const hasRoi = Boolean(input.minRoiExact || input.maxRoiExact);
  const complete = hasPolicy && hasLod && hasRoi;
  return {
    completenessState: complete ? "complete" : "incomplete",
    shouldDemoteFromPublished: !complete,
  };
}

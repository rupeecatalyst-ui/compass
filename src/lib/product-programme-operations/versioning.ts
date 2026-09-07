import { evaluateProgrammeCompleteness } from "@/lib/product-programme-operations/completeness";
import {
  ProgrammeConflictError,
  type ProgrammeVersionRecord,
  type StructuredProgrammePayload,
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

export function nextDraftVersionNumber(maxExistingVersionNumber: number): number {
  return maxExistingVersionNumber + 1;
}

export function classifyIncompleteStub(payload: StructuredProgrammePayload): {
  completenessState: "incomplete" | "complete";
  shouldDemoteFromPublished: boolean;
} {
  const complete = evaluateProgrammeCompleteness(payload).complete;
  return {
    completenessState: complete ? "complete" : "incomplete",
    shouldDemoteFromPublished: !complete,
  };
}

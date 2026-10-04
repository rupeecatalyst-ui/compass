import {
  isPublishedCommercialProgram,
  type CommercialProgramPublicationFields,
} from "@/lib/enterprise-lender-registry/program-architecture";

export const LEGACY_PROGRAMME_REVIEW_LABEL = "Legacy programme — review required";

export type LegacyReviewProgrammeLike = CommercialProgramPublicationFields & {
  status?: string | null;
  lifecycleStatus?: string | null;
};

function isDeletedProgramme(program: Pick<LegacyReviewProgrammeLike, "isDeleted">): boolean {
  return program.isDeleted === true;
}

/**
 * Option 1 complete-active legacy programmes: administrator-visible, not CHANAKYA-live.
 * Detection is the post-migration publication tuple, not a fabricated commercial complete flag.
 */
export function isLegacyProgrammeReviewRequired(program: LegacyReviewProgrammeLike): boolean {
  if (isDeletedProgramme(program)) return false;
  if (program.status === "archived" || program.lifecycleStatus === "archived") return false;
  return (
    program.status === "active" &&
    program.lifecycleStatus === "active" &&
    program.isLivePublished === false &&
    program.publicationState === "published"
  );
}

export function isRegistryVisibleProgramme(program: LegacyReviewProgrammeLike): boolean {
  return isPublishedCommercialProgram(program) || isLegacyProgrammeReviewRequired(program);
}

export function mustCreateDraftRevision(program: LegacyReviewProgrammeLike): boolean {
  return (
    (!isDeletedProgramme(program) &&
      program.isLivePublished === true &&
      program.publicationState === "published") ||
    isLegacyProgrammeReviewRequired(program)
  );
}

export function canCitePublishedProgramme(program: LegacyReviewProgrammeLike): boolean {
  return isPublishedCommercialProgram(program);
}

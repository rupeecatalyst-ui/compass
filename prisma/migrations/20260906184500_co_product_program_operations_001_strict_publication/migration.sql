-- CO-PRODUCT-PROGRAM-OPERATIONS-001 — Strict publication remediator.
-- Additive status correction only. Does not delete rows. Does not invent policy, LOD, ROI or money.
--
-- Residual is_live_published=true rows are unpublished. SQL cannot run
-- evaluateProgrammeCompleteness, so this migration never auto-promotes to CHANAKYA-live.
-- Option 1: complete-active residual rows stay active and administrator-visible
-- (publication_state=published, completeness_state=incomplete, is_live_published=false).
-- They are not drafted. Archived rows stay archived. Deleted rows are never touched.

UPDATE "enterprise_lender_programs"
SET
  "is_live_published" = false,
  "completeness_state" = CASE
    WHEN "lifecycle_status" = 'archived'::"LenderProgramLifecycleStatus"
      OR "status" = 'archived'::"RegistryStatus"
      THEN "completeness_state"
    ELSE 'incomplete'::"ProgrammeCompletenessState"
  END,
  "publication_state" = CASE
    WHEN "lifecycle_status" = 'archived'::"LenderProgramLifecycleStatus"
      OR "status" = 'archived'::"RegistryStatus"
      THEN 'archived'::"ProgrammePublicationState"
    WHEN "status" = 'active'::"RegistryStatus"
      AND "lifecycle_status" = 'active'::"LenderProgramLifecycleStatus"
      THEN 'published'::"ProgrammePublicationState"
    ELSE 'draft'::"ProgrammePublicationState"
  END
WHERE "is_deleted" = false
  AND "is_live_published" = true;

-- Preserve every archived programme, complete or incomplete.
-- Does not invent policy, LOD, ROI or money. Does not revive deleted rows.
UPDATE "enterprise_lender_programs"
SET
  "publication_state" = 'archived'::"ProgrammePublicationState",
  "lifecycle_status" = 'archived'::"LenderProgramLifecycleStatus",
  "status" = 'archived'::"RegistryStatus",
  "is_live_published" = false
WHERE "is_deleted" = false
  AND (
    "lifecycle_status" = 'archived'::"LenderProgramLifecycleStatus"
    OR "status" = 'archived'::"RegistryStatus"
  );

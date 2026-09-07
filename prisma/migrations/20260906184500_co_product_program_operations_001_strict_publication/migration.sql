-- CO-PRODUCT-PROGRAM-OPERATIONS-001 — Strict publication remediator.
-- Additive status correction only. Does not delete rows. Does not invent policy, LOD, ROI or money.
--
-- The prior programme-operations migration could mark a thin active row live-published
-- when it only had policy ref + LOD + one ROI field. Publication must use the same
-- complete application validator (evaluateProgrammeCompleteness). SQL cannot run that
-- TypeScript validator, so this migration never auto-promotes. Every surviving row is
-- draft/incomplete unless it is already archived. Administrators republish after the
-- structured editor is complete.

UPDATE "enterprise_lender_programs"
SET
  "is_live_published" = false,
  "completeness_state" = 'incomplete',
  "publication_state" = CASE
    WHEN "lifecycle_status" = 'archived'::"LenderProgramLifecycleStatus"
      OR "status" = 'archived'::"RegistryStatus"
      THEN 'archived'::"ProgrammePublicationState"
    ELSE 'draft'::"ProgrammePublicationState"
  END,
  "lifecycle_status" = CASE
    WHEN "lifecycle_status" = 'archived'::"LenderProgramLifecycleStatus"
      THEN 'archived'::"LenderProgramLifecycleStatus"
    ELSE 'draft'::"LenderProgramLifecycleStatus"
  END,
  "status" = CASE
    WHEN "status" = 'archived'::"RegistryStatus"
      THEN 'archived'::"RegistryStatus"
    ELSE 'draft'::"RegistryStatus"
  END
WHERE "is_deleted" = false
  AND "is_live_published" = true;

-- Preserve archived programmes that were never live-published. The new
-- publication_state column defaults to draft; archived lifecycle/status must
-- remain archived. Does not invent policy, LOD, ROI or money.
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

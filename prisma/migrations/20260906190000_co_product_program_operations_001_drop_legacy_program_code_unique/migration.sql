-- CO-PRODUCT-PROGRAM-OPERATIONS-001 — Drop leftover unique index on programme code.
-- Additive only. Does not delete business rows. Does not invent policy, LOD, ROI or money.
--
-- Baseline created UNIQUE INDEX elprog_org_code_key. The programme-operations
-- migration attempted DROP CONSTRAINT, which does not remove an index.
-- Draft revisions legally share code with the live published row; uniqueness
-- remains the partial live-published index elprog_org_code_live_published_key.

DROP INDEX IF EXISTS "elprog_org_code_key";

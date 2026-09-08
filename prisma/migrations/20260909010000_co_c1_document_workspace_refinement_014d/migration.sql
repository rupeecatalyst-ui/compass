-- CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014D
-- Additive inbound classification snapshot on existing Enterprise Transaction Documents.
-- Does not rewrite ownership, lender programme stamps, or historical LOD.
-- Does not physically destroy binaries.
--
-- Intended apply order:
--   1. 20260908220000_co_c1_document_workspace_refinement_014c
--   2. 20260909010000_co_c1_document_workspace_refinement_014d (this file)
-- Do not apply to production in this phase. Do not run db push.

ALTER TABLE "enterprise_transaction_documents"
  ADD COLUMN IF NOT EXISTS "inbound_classification_json" JSONB;

CREATE INDEX IF NOT EXISTS "etd_org_inbound_email_idx"
  ON "enterprise_transaction_documents" ("organization_id", "inbound_email_id");
